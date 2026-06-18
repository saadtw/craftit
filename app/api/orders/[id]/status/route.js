import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import User from "@/models/User";
import EscrowTransaction from "@/models/EscrowTransaction";
import { notify } from "@/services/notificationService";
import { resolveRequestSession } from "@/lib/requestAuth";

// ── Stripe is optional — if STRIPE_SECRET_KEY is not set, payment steps are skipped
let stripe = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    const Stripe = (await import("stripe")).default;
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });
  }
} catch {
  // Stripe not available — payment steps will be no-ops
}

// PUT /api/orders/[id]/status - Update order status (manufacturer actions)
export async function PUT(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const {
      status,
      rejectionReason,
      estimatedDeliveryDate,
      trackingNumber,
      shippingMethod,
    } = body;

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.manufacturerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (order.cancellationStatus === "requested") {
      return NextResponse.json(
        {
          error:
            "This order has a pending cancellation request. Resolve it before changing order status.",
        },
        { status: 409 },
      );
    }

    const originalStatus = order.status;

    // Valid transitions — includes "shipped" between in_production and completed
    const validTransitions = {
      confirmed: ["in_production", "cancelled"],
      accepted: ["in_production", "cancelled"],
      in_production: ["shipped", "cancelled"],
      shipped: ["delivered", "completed"],
      delivered: ["completed"],
    };

    const allowed = validTransitions[order.status];
    if (!allowed || !allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from '${order.status}' to '${status}'` },
        { status: 400 },
      );
    }

    order.status = status;

    // ── Accept ─────────────────────────────────────────────────────────────
    if (status === "accepted") {
      order.manufacturerAcceptedAt = new Date();
      if (estimatedDeliveryDate) {
        order.estimatedDeliveryDate = new Date(estimatedDeliveryDate);
      }

      // Seed milestones from bid if not yet seeded
      if (order.milestones.length === 0 && order.bidId) {
        try {
          const BidModel = (await import("@/models/Bid")).default;
          const bid = await BidModel.findById(order.bidId).lean();
          if (bid?.proposedMilestones?.length > 0) {
            order.milestones = bid.proposedMilestones.map((m) => ({
              name: m.name,
              description: m.description,
              status: "pending",
            }));
          }
        } catch {
          // Non-fatal — proceed without milestone seeding
        }
      }

      // Payment capture is deferred to the in_production transition where
      // proper escrow records are created. No capture here.

      await notify.orderAccepted(
        order.customerId,
        order._id,
        order.orderNumber,
      );
    }

    // ── In production ──────────────────────────────────────────────────────
    if (status === "in_production") {
      if (shippingMethod) order.shippingMethod = shippingMethod;

      // Capture payment and place in escrow
      if (stripe) {
        if (order.paymentIntentId && order.paymentStatus === "authorized") {
          try {
            await stripe.paymentIntents.capture(order.paymentIntentId);
            order.paymentStatus = "held_in_escrow";
            await EscrowTransaction.create([
              {
                orderId: order._id,
                customerId: order.customerId,
                manufacturerId: order.manufacturerId,
                amount: order.totalPrice,
                type: "payment_received",
                reference: order.paymentIntentId,
              },
              {
                orderId: order._id,
                customerId: order.customerId,
                manufacturerId: order.manufacturerId,
                amount: order.totalPrice,
                type: "held",
                reference: order.paymentIntentId,
              },
            ]);
          } catch (stripeErr) {
            console.error("Stripe capture failed:", stripeErr.message);
            throw new Error("Failed to capture authorized payment: " + stripeErr.message);
          }
        } else if (order.paymentStatus === "pending" && order.paymentMethod === "card") {
          // Off-session capture for orders placed without upfront holds
          try {
            const User = (await import("@/models/User")).default;
            const customer = await User.findById(order.customerId).lean();
            const savedCard = customer?.paymentMethods?.find(m => m.provider === "stripe");
            
            if (!savedCard || !savedCard.stripePaymentMethodId || !customer.stripeCustomerId) {
              throw new Error("Customer does not have a valid saved card for automatic payment.");
            }

            const paymentIntent = await stripe.paymentIntents.create({
              amount: Math.round(order.totalPrice * 100),
              currency: "usd",
              customer: customer.stripeCustomerId,
              payment_method: savedCard.stripePaymentMethodId,
              off_session: true,
              confirm: true,
              metadata: {
                orderId: String(order._id),
                orderNumber: order.orderNumber,
                type: "product"
              }
            });

            order.paymentIntentId = paymentIntent.id;
            order.paymentStatus = "held_in_escrow";
            
            await EscrowTransaction.create([
              {
                orderId: order._id,
                customerId: order.customerId,
                manufacturerId: order.manufacturerId,
                amount: order.totalPrice,
                type: "payment_received",
                reference: paymentIntent.id,
              },
              {
                orderId: order._id,
                customerId: order.customerId,
                manufacturerId: order.manufacturerId,
                amount: order.totalPrice,
                type: "held",
                reference: paymentIntent.id,
              },
            ]);
          } catch (stripeErr) {
            console.error("Off-session payment failed:", stripeErr.message);
            throw new Error("Failed to charge customer's saved card: " + stripeErr.message);
          }
        }
      }

      // If payment was already captured (e.g. by webhook race or RFQ immediate capture)
      // but not yet tracked in escrow, promote to held_in_escrow with ledger entries
      if (
        order.paymentIntentId &&
        order.paymentStatus === "captured"
      ) {
        order.paymentStatus = "held_in_escrow";
        await EscrowTransaction.create([
          {
            orderId: order._id,
            customerId: order.customerId,
            manufacturerId: order.manufacturerId,
            amount: order.totalPrice,
            type: "payment_received",
            reference: order.paymentIntentId,
          },
          {
            orderId: order._id,
            customerId: order.customerId,
            manufacturerId: order.manufacturerId,
            amount: order.totalPrice,
            type: "held",
            reference: order.paymentIntentId,
          },
        ]).catch((err) => console.error("Escrow ledger entry failed:", err.message));
      }
      // P1-B: notify customer that production has started
      await notify.orderInProduction(
        order.customerId,
        order._id,
        order.orderNumber,
      );
    }

    // ── Shipped ────────────────────────────────────────────────────────────
    if (status === "shipped") {
      if (trackingNumber) order.trackingNumber = trackingNumber;
      if (shippingMethod) order.shippingMethod = shippingMethod;
      if (estimatedDeliveryDate) {
        order.estimatedDeliveryDate = new Date(estimatedDeliveryDate);
      }
      await notify.orderShipped(order.customerId, order._id, order.orderNumber);
    }

    // ── Completed ──────────────────────────────────────────────────────────
    if (status === "completed") {
      order.completedAt = new Date();
      order.actualDeliveryDate = new Date();
      // Mark payment as captured (it was already captured on accept — this is belt-and-suspenders)
      if (order.paymentStatus === "captured" || !order.paymentIntentId) {
        // payment is already handled
      }

      // Update manufacturer stats
      await User.findByIdAndUpdate(session.user.id, {
        $inc: {
          "stats.completedOrders": 1,
          "stats.totalRevenue": order.totalPrice,
        },
      });

      notify.orderCompleted(
        order.customerId,
        order.manufacturerId,
        order._id,
        order.orderNumber,
      );
      notify.paymentReceived(
        order.manufacturerId,
        order._id,
        order.orderNumber,
        order.totalPrice,
      );
    }

    // ── Cancelled ──────────────────────────────────────────────────────────
    if (status === "cancelled") {
      order.cancelledAt = new Date();
      order.cancelledBy = session.user.id;
      order.cancellationReason = rejectionReason || "Cancelled by manufacturer";

      if (originalStatus === "confirmed") {
        order.rejectedAt = new Date();
        order.rejectionReason = rejectionReason || "Rejected by manufacturer";

        // Cancel Stripe authorization if not yet captured
        if (
          stripe &&
          order.paymentIntentId &&
          order.paymentStatus === "authorized"
        ) {
          try {
            await stripe.paymentIntents.cancel(order.paymentIntentId);
            order.paymentStatus = "refunded";
          } catch (stripeErr) {
            console.error("Stripe cancel failed:", stripeErr.message);
          }
        }
      }

      await notify.orderRejected(
        order.customerId,
        order._id,
        order.orderNumber,
      );
    }

    await order.save();

    const updatedOrder = await Order.findById(id)
      .populate("customerId", "name email")
      .populate("manufacturerId", "name businessName email")
      .lean();

    return NextResponse.json({
      success: true,
      message: `Order status updated to '${status}'`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Order status update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/orders/[id]/status - Update shipping/tracking info only (no status transition)
export async function PATCH(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { trackingNumber, shippingMethod } = body;

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.manufacturerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (order.cancellationStatus === "requested") {
      return NextResponse.json(
        {
          error:
            "This order has a pending cancellation request. Resolve it before updating shipping details.",
        },
        { status: 409 },
      );
    }

    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
    if (shippingMethod !== undefined) order.shippingMethod = shippingMethod;

    await order.save();

    const updatedOrder = await Order.findById(id)
      .populate("customerId", "name email")
      .populate("manufacturerId", "name businessName email")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Shipping information updated",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Tracking update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

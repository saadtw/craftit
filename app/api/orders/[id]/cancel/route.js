import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import AdminLog from "@/models/AdminLog";
import { notify } from "@/services/notificationService";

// Stripe is optional in dev environments.
let stripe = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    const Stripe = (await import("stripe")).default;
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });
  }
} catch {
  stripe = null;
}

const DIRECT_CANCEL_WINDOW_MS = 48 * 60 * 60 * 1000;
const REQUEST_CANCEL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MANUFACTURER_RESPONSE_WINDOW_MS = 72 * 60 * 60 * 1000;

function getMsSinceAcceptance(order) {
  const acceptedAt = order.manufacturerAcceptedAt || order.createdAt;
  const elapsed = Date.now() - new Date(acceptedAt).getTime();
  return elapsed;
}

function isManufacturerResponseOverdue(order) {
  if (!order.cancellationRequestedAt) return false;
  const elapsed =
    Date.now() - new Date(order.cancellationRequestedAt).getTime();
  return elapsed >= MANUFACTURER_RESPONSE_WINDOW_MS;
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function processRefund(order, reason) {
  if (!order.paymentIntentId) {
    order.refundReason = reason;
    return;
  }

  if (!stripe) {
    if (["authorized", "captured"].includes(order.paymentStatus)) {
      order.paymentStatus = "refunded";
      order.refundAmount = order.totalPrice;
    }
    order.refundReason = reason;
    return;
  }

  if (order.paymentStatus === "authorized") {
    await stripe.paymentIntents.cancel(order.paymentIntentId);
    order.paymentStatus = "refunded";
    order.refundAmount = order.totalPrice;
    order.refundReason = reason;
    return;
  }

  if (order.paymentStatus === "captured") {
    await stripe.refunds.create({
      payment_intent: order.paymentIntentId,
      reason: "requested_by_customer",
    });
    order.paymentStatus = "refunded";
    order.refundAmount = order.totalPrice;
    order.refundReason = reason;
    return;
  }

  order.refundReason = reason;
}

// POST /api/orders/[id]/cancel
// ?action=request|confirm|reject|admin_force
export async function POST(request, context) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "request";

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (action === "request") {
      if (session.user.role !== "customer") {
        return NextResponse.json(
          { error: "Only customers can request cancellation" },
          { status: 403 },
        );
      }

      if (order.customerId.toString() !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { reason } = await readBody(request);
      const cancellationReason = reason || "Cancelled by customer";

      if (order.status === "cancelled") {
        return NextResponse.json(
          { error: "Order is already cancelled" },
          { status: 400 },
        );
      }

      if (
        ["in_production", "shipped", "completed", "disputed"].includes(
          order.status,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Cannot cancel this order directly at its current stage. Please open a dispute.",
            requiresDispute: true,
          },
          { status: 400 },
        );
      }

      // Pre-acceptance cancellation remains unilateral.
      if (order.status === "pending_acceptance") {
        await processRefund(order, "Cancelled before manufacturer acceptance");

        order.status = "cancelled";
        order.cancelledAt = new Date();
        order.cancelledBy = session.user.id;
        order.cancellationReason = cancellationReason;
        order.cancellationStatus = undefined;
        order.cancellationRequestedAt = undefined;
        order.cancellationRequestedBy = undefined;
        order.cancellationConfirmedAt = undefined;
        order.cancellationRejectedAt = undefined;
        order.cancellationRejectionReason = undefined;

        await order.save();

        await notify.orderCancelled(
          order.manufacturerId,
          order._id,
          order.orderNumber,
          false,
        );

        return NextResponse.json({
          success: true,
          message: "Order cancelled successfully.",
          order,
        });
      }

      if (order.status !== "accepted") {
        return NextResponse.json(
          { error: `Cannot cancel order in status: ${order.status}` },
          { status: 400 },
        );
      }

      const elapsedSinceAcceptanceMs = getMsSinceAcceptance(order);

      // Within 48h: customer can cancel unilaterally even after acceptance.
      if (elapsedSinceAcceptanceMs <= DIRECT_CANCEL_WINDOW_MS) {
        await processRefund(
          order,
          "Cancelled within 48-hour acceptance window",
        );

        order.status = "cancelled";
        order.cancelledAt = new Date();
        order.cancelledBy = session.user.id;
        order.cancellationReason = cancellationReason;
        order.cancellationStatus = "confirmed";
        order.cancellationConfirmedAt = new Date();
        order.cancellationRequestedAt = undefined;
        order.cancellationRequestedBy = undefined;
        order.cancellationRejectedAt = undefined;
        order.cancellationRejectionReason = undefined;

        await order.save();

        await notify.orderCancelled(
          order.manufacturerId,
          order._id,
          order.orderNumber,
          false,
        );

        return NextResponse.json({
          success: true,
          message: "Order cancelled successfully.",
          order,
        });
      }

      if (elapsedSinceAcceptanceMs > REQUEST_CANCEL_WINDOW_MS) {
        return NextResponse.json(
          {
            error:
              "The cancellation request window has expired. Please open a dispute for admin review.",
            requiresDispute: true,
          },
          { status: 400 },
        );
      }

      if (order.cancellationStatus === "requested") {
        return NextResponse.json(
          { error: "A cancellation request is already pending." },
          { status: 400 },
        );
      }

      if (order.cancellationStatus === "rejected") {
        return NextResponse.json(
          {
            error:
              "This cancellation request was already declined. Please open a dispute if you need escalation.",
            requiresDispute: true,
          },
          { status: 400 },
        );
      }

      order.cancellationStatus = "requested";
      order.cancellationRequestedAt = new Date();
      order.cancellationRequestedBy = session.user.id;
      order.cancellationReason = cancellationReason;
      order.cancellationConfirmedAt = undefined;
      order.cancellationRejectedAt = undefined;
      order.cancellationRejectionReason = undefined;

      await order.save();

      await notify.cancellationRequested(
        order.manufacturerId,
        order._id,
        order.orderNumber,
        cancellationReason,
      );

      return NextResponse.json({
        success: true,
        requiresConfirmation: true,
        message:
          "Cancellation request sent to manufacturer. They have up to 72 hours to respond.",
        order,
      });
    }

    if (action === "confirm") {
      if (session.user.role !== "manufacturer") {
        return NextResponse.json(
          { error: "Only manufacturers can confirm cancellation requests" },
          { status: 403 },
        );
      }

      if (order.manufacturerId.toString() !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (
        !["accepted", "in_production"].includes(order.status) ||
        order.cancellationStatus !== "requested"
      ) {
        return NextResponse.json(
          { error: "No active cancellation request to confirm" },
          { status: 400 },
        );
      }

      await processRefund(order, "Manufacturer confirmed cancellation request");

      order.status = "cancelled";
      order.cancelledAt = new Date();
      order.cancelledBy = session.user.id;
      order.cancellationStatus = "confirmed";
      order.cancellationConfirmedAt = new Date();
      order.cancellationRejectedAt = undefined;
      order.cancellationRejectionReason = undefined;

      await order.save();

      await notify.cancellationConfirmed(
        order.customerId,
        order._id,
        order.orderNumber,
      );

      return NextResponse.json({
        success: true,
        message: "Cancellation confirmed and order cancelled.",
        order,
      });
    }

    if (action === "reject") {
      if (session.user.role !== "manufacturer") {
        return NextResponse.json(
          { error: "Only manufacturers can reject cancellation requests" },
          { status: 403 },
        );
      }

      if (order.manufacturerId.toString() !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (
        !["accepted", "in_production"].includes(order.status) ||
        order.cancellationStatus !== "requested"
      ) {
        return NextResponse.json(
          { error: "No active cancellation request to reject" },
          { status: 400 },
        );
      }

      const { reason } = await readBody(request);
      const rejectionReason = (reason || "").trim();
      if (!rejectionReason) {
        return NextResponse.json(
          { error: "Rejection reason is required" },
          { status: 400 },
        );
      }

      order.cancellationStatus = "rejected";
      order.cancellationConfirmedAt = undefined;
      order.cancellationRejectedAt = new Date();
      order.cancellationRejectionReason = rejectionReason;

      await order.save();

      await notify.cancellationRejected(
        order.customerId,
        order._id,
        order.orderNumber,
        rejectionReason,
      );

      return NextResponse.json({
        success: true,
        message: "Cancellation request rejected.",
        order,
      });
    }

    if (action === "admin_force") {
      if (session.user.role !== "admin") {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 },
        );
      }

      if (
        !["accepted", "in_production"].includes(order.status) ||
        order.cancellationStatus !== "requested"
      ) {
        return NextResponse.json(
          { error: "No pending cancellation request on this order" },
          { status: 400 },
        );
      }

      if (!isManufacturerResponseOverdue(order)) {
        return NextResponse.json(
          {
            error:
              "Manufacturer response window is still active. Admin intervention is allowed after 72 hours.",
          },
          { status: 400 },
        );
      }

      const { reason } = await readBody(request);
      const adminReason =
        reason || "Manufacturer unresponsive after cancellation request";
      const previousStatus = order.status;

      await processRefund(order, "Admin-forced cancellation");

      order.status = "cancelled";
      order.cancelledAt = new Date();
      order.cancelledBy = session.user.id;
      order.cancellationStatus = "confirmed";
      order.cancellationConfirmedAt = new Date();
      order.cancellationReason = adminReason;

      await order.save();

      await AdminLog.create({
        adminId: session.user.id,
        action: "order_force_cancelled",
        targetType: "order",
        targetId: order._id,
        description: `Force-cancelled order ${order.orderNumber} after manufacturer timeout`,
        details: `Previous status: ${previousStatus}. Reason: ${adminReason}`,
      });

      await Promise.all([
        notify.orderCancelled(
          order.customerId,
          order._id,
          order.orderNumber,
          true,
        ),
        notify.orderCancelled(
          order.manufacturerId,
          order._id,
          order.orderNumber,
          false,
        ),
      ]);

      return NextResponse.json({
        success: true,
        message: "Order force-cancelled by admin.",
        order,
      });
    }

    return NextResponse.json(
      { error: `Invalid action: ${action}` },
      { status: 400 },
    );
  } catch (error) {
    console.error("Cancel order error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

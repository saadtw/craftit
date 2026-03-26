import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import stripe from "@/lib/stripe";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import { notify } from "@/services/notificationService";

/**
 * POST /api/payments/refund
 *
 * Triggers a Stripe refund.
 * Can be called by:
 *   - Customer cancelling before manufacturer accepts (full refund)
 *   - Admin resolving a dispute in customer's favour (full or partial)
 *
 * Body: {
 *   orderId: string,
 *   amount?: number  (USD dollars — omit for full refund)
 *   reason?: "duplicate" | "fraudulent" | "requested_by_customer"
 * }
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const {
      orderId,
      amount,
      reason = "requested_by_customer",
    } = await request.json();

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Authorization check
    const isAdmin = session.user.role === "admin";
    const isOrderCustomer =
      session.user.role === "customer" &&
      order.customerId.toString() === session.user.id;

    // Customer can only refund if order is still pending acceptance (card authorized but not captured)
    if (isOrderCustomer && order.paymentStatus === "captured") {
      return NextResponse.json(
        {
          error:
            "Cannot self-refund a captured payment. Please open a dispute.",
        },
        { status: 403 },
      );
    }

    if (!isAdmin && !isOrderCustomer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!order.paymentIntentId) {
      return NextResponse.json(
        { error: "No payment on file for this order" },
        { status: 400 },
      );
    }

    const refundParams = {
      payment_intent: order.paymentIntentId,
      reason,
    };

    // If order is only authorized (not captured), cancel instead of refund
    // — Stripe will release the hold automatically
    const paymentIntent = await stripe.paymentIntents.retrieve(
      order.paymentIntentId,
    );

    let refund;
    if (
      paymentIntent.status === "requires_capture" ||
      paymentIntent.status === "canceled"
    ) {
      // Cancel the authorization
      await stripe.paymentIntents.cancel(order.paymentIntentId);
    } else {
      // Captured — issue a refund
      if (amount) {
        refundParams.amount = Math.round(amount * 100); // to cents
      }
      refund = await stripe.refunds.create(refundParams);
    }

    // Update order
    const isPartial = amount && amount < order.totalPrice;
    order.paymentStatus = isPartial ? "partially_refunded" : "refunded";
    order.refundAmount = amount || order.totalPrice;
    order.refundReason = reason;
    if (!isPartial) order.status = "cancelled";
    await order.save();

    await notify.paymentRefunded(
      order.customerId,
      order._id,
      order.orderNumber,
      amount || order.totalPrice,
    );

    return NextResponse.json({ success: true, refund: refund || null });
  } catch (error) {
    console.error("refund error:", error);
    return NextResponse.json(
      { error: error.message || "Refund failed" },
      { status: 500 },
    );
  }
}

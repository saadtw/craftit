import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import getStripe from "@/lib/stripe";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import { notify } from "@/services/notificationService";
import { resolveRequestSession } from "@/lib/requestAuth";

/**
 * POST /api/payments/capture
 *
 * Called when a manufacturer accepts an order.
 * Captures the previously authorized PaymentIntent (actually charges the card).
 *
 * Body: { orderId: string }
 */
export async function POST(request) {
  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { orderId } = await request.json();

    const order = await Order.findOne({
      _id: orderId,
      manufacturerId: session.user.id,
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.paymentIntentId) {
      return NextResponse.json(
        { error: "No payment intent found for this order" },
        { status: 400 },
      );
    }

    if (order.paymentStatus === "captured") {
      return NextResponse.json(
        { error: "Payment already captured" },
        { status: 400 },
      );
    }

    // Capture the funds — this is when the customer's card is actually charged
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.capture(
      order.paymentIntentId,
    );

    order.paymentStatus = "captured";
    order.status = "accepted";
    order.manufacturerAcceptedAt = new Date();
    await order.save();

    await notify.orderAccepted(order.customerId, order._id, order.orderNumber);

    return NextResponse.json({ success: true, paymentIntent });
  } catch (error) {
    console.error("capture error:", error);
    return NextResponse.json(
      { error: error.message || "Capture failed" },
      { status: 500 },
    );
  }
}

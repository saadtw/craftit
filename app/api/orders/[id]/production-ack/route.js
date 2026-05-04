import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import { resolveRequestSession } from "@/lib/requestAuth";
import { notify } from "@/services/notificationService";

// POST /api/orders/[id]/production-ack
// Customer acknowledges the start of production and pays remaining balance.
export async function POST(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const order = await Order.findById(id).populate("manufacturerId");
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.customerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (order.orderType !== "group_buy") {
      return NextResponse.json(
        { error: "Production acknowledgment is only for group buy orders" },
        { status: 400 }
      );
    }

    if (order.status !== "awaiting_production_ack") {
      return NextResponse.json(
        { error: "Order is not awaiting production acknowledgment" },
        { status: 400 }
      );
    }

    // In a real flow, the customer would have already paid the remaining balance
    // via a PaymentIntent on the frontend, and passed the new paymentIntentId here.
    // For now, we simply update the status.
    const body = await request.json().catch(() => ({}));

    order.status = "accepted";
    // We could store the secondary paymentIntentId if passed:
    if (body.remainingPaymentIntentId) {
      order.paymentIntentId = body.remainingPaymentIntentId; // or store in a separate field
      order.paymentStatus = "captured";
    }

    await order.save();

    // Notify manufacturer that customer acknowledged production
    notify.orderAccepted(
      order.manufacturerId._id,
      order._id,
      order.orderNumber
    );

    return NextResponse.json({
      success: true,
      message: "Production acknowledged successfully",
      status: order.status,
    });
  } catch (error) {
    console.error("Production ack POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

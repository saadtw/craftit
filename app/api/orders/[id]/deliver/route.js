import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import { resolveRequestSession } from "@/lib/requestAuth";
import { notify } from "@/services/notificationService";

export async function POST(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.customerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (order.status !== "shipped") {
      return NextResponse.json(
        { error: "Only shipped orders can be confirmed delivered." },
        { status: 400 },
      );
    }

    const deliveredAt = new Date();
    const disputeWindowClosedAt = new Date(deliveredAt);
    disputeWindowClosedAt.setDate(disputeWindowClosedAt.getDate() + 7);

    order.status = "delivered";
    order.deliveredAt = deliveredAt;
    order.actualDeliveryDate = deliveredAt;
    order.deliveryConfirmedBy = "customer";
    order.disputeWindowClosedAt = disputeWindowClosedAt;
    await order.save();

    await notify.orderDelivered(order.manufacturerId, order._id, order.orderNumber);

    return NextResponse.json({
      success: true,
      deliveredAt,
      disputeWindowClosedAt,
    });
  } catch (error) {
    console.error("Deliver order error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

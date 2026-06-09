import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import { resolveRequestSession } from "@/lib/requestAuth";
import { notify } from "@/services/notificationService";

// POST /api/orders/[id]/production-ack
// Manufacturer optionally acknowledges production start for bid-created orders.
export async function POST(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.manufacturerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (order.status !== "confirmed") {
      return NextResponse.json(
        { error: "Only confirmed bid orders can be marked as production started" },
        { status: 400 },
      );
    }

    order.status = "in_production";
    order.productionAcknowledgedAt = new Date();
    await order.save();

    await notify.productionStarted(
      order.customerId,
      order._id,
      order.orderNumber,
    );

    return NextResponse.json({
      success: true,
      message: "Production start recorded",
      order,
    });
  } catch (error) {
    console.error("Production ack POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

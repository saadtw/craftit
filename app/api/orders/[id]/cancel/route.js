import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";

// POST - Customer cancels order (only allowed before manufacturer accepts)
export async function POST(request, context) {
  const { id } = await context.params;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { reason } = body;

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.customerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Customers can only cancel before the manufacturer accepts
    if (order.status !== "pending_acceptance") {
      return NextResponse.json(
        {
          error:
            "Order can only be cancelled before the manufacturer accepts it. Please file a dispute for orders already in progress.",
        },
        { status: 400 },
      );
    }

    order.status = "cancelled";
    order.cancelledAt = new Date();
    order.cancelledBy = session.user.id;
    order.cancellationReason = reason || "Cancelled by customer";
    order.paymentStatus = "refunded";

    await order.save();

    return NextResponse.json({
      success: true,
      message: "Order cancelled successfully. A full refund will be processed.",
      order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

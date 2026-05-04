import { NextResponse } from "next/server";
import { resolveRequestSession } from "@/lib/requestAuth";
import connectDB from "@/lib/mongodb";
import PaymentSchedule from "@/models/PaymentSchedule";
import Order from "@/models/Order";

// GET /api/orders/[id]/payment-schedule
export async function GET(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (
      order.customerId.toString() !== session.user.id &&
      order.manufacturerId.toString() !== session.user.id &&
      session.user.role !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const schedule = await PaymentSchedule.findOne({ orderId: id });
    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    console.error("Get payment schedule error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/orders/[id]/payment-schedule
export async function POST(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (
      order.customerId.toString() !== session.user.id &&
      order.manufacturerId.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { action, instalments } = await request.json();

    if (action === "propose") {
      let schedule = await PaymentSchedule.findOne({ orderId: id });
      if (!schedule) {
        schedule = new PaymentSchedule({
          orderId: id,
          manufacturerId: order.manufacturerId,
          customerId: order.customerId,
          status: "proposed",
          instalments,
        });
      } else {
        schedule.instalments = instalments;
        schedule.status = "proposed";
      }

      // Check sum of percentages
      const sum = instalments.reduce((s, i) => s + i.percent, 0);
      if (sum !== 100) {
        return NextResponse.json({ error: "Instalment percentages must sum to 100" }, { status: 400 });
      }

      await schedule.save();

      return NextResponse.json({
        success: true,
        message: "Payment schedule proposed",
        schedule,
      });
    } else if (action === "accept" || action === "reject") {
      const schedule = await PaymentSchedule.findOne({ orderId: id });
      if (!schedule) {
        return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
      }

      schedule.status = action === "accept" ? "accepted" : "rejected";
      await schedule.save();

      return NextResponse.json({
        success: true,
        message: `Payment schedule ${action}ed`,
        schedule,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Manage payment schedule error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import { createNotification, notify } from "@/services/notificationService";

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 3);

    const orders = await Order.find({
      status: "shipped",
      estimatedDeliveryDate: { $lte: threshold },
    });

    for (const order of orders) {
      const deliveredAt = new Date();
      const disputeWindowClosedAt = new Date(deliveredAt);
      disputeWindowClosedAt.setDate(disputeWindowClosedAt.getDate() + 7);

      order.status = "delivered";
      order.deliveredAt = deliveredAt;
      order.actualDeliveryDate = deliveredAt;
      order.deliveryConfirmedBy = "auto";
      order.disputeWindowClosedAt = disputeWindowClosedAt;
      await order.save();

      await createNotification({
        userId: order.customerId,
        type: "order_delivered",
        title: "Order marked delivered",
        message: `Order #${order.orderNumber} has been marked delivered automatically.`,
        link: `/customer/orders/${order._id}`,
        relatedType: "order",
        relatedId: order._id,
      });
      await notify.orderDelivered(order.manufacturerId, order._id, order.orderNumber);
    }

    return NextResponse.json({ success: true, processed: orders.length });
  } catch (error) {
    console.error("auto-deliver cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

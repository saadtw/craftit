import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import { notify } from "@/services/notificationService";

/**
 * PATCH /api/orders/[id]/ship
 *
 * Manufacturer marks an order as shipped and provides tracking info.
 * Body: {
 *   trackingNumber: string,
 *   shippingMethod: string,   (e.g. "DHL", "FedEx", "TCS", "Leopards")
 *   estimatedDeliveryDate?: string (ISO date)
 * }
 */
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const order = await Order.findOne({
      _id: params.id,
      manufacturerId: session.user.id,
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "in_production") {
      return NextResponse.json(
        { error: "Order must be in production before it can be shipped" },
        { status: 400 },
      );
    }

    const { trackingNumber, shippingMethod, estimatedDeliveryDate } =
      await request.json();

    if (!trackingNumber || !shippingMethod) {
      return NextResponse.json(
        { error: "trackingNumber and shippingMethod are required" },
        { status: 400 },
      );
    }

    order.status = "shipped";
    order.trackingNumber = trackingNumber;
    order.shippingMethod = shippingMethod;
    if (estimatedDeliveryDate) {
      order.estimatedDeliveryDate = new Date(estimatedDeliveryDate);
    }
    await order.save();

    await notify.orderShipped(order.customerId, order._id, order.orderNumber);

    return NextResponse.json({ order });
  } catch (error) {
    console.error("PATCH /api/orders/[id]/ship error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

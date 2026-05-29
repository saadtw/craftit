import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import AdminLog from "@/models/AdminLog";
import { resolveRequestSession } from "@/lib/requestAuth";
import { notify } from "@/services/notificationService";

/**
 * POST /api/orders/[id]/ship
 * Manufacturer marks an order as shipped.
 *
 * Body: { trackingNumber?, carrier?, estimatedDelivery? }
 */
export async function POST(request, context) {
  try {
    const { id } = await context.params;

    // 1. Authentication
    const session = await resolveRequestSession(request);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "manufacturer") {
      return NextResponse.json(
        { success: false, error: "Only manufacturers can mark orders as shipped" },
        { status: 403 }
      );
    }

    // 2. Parse body
    let body = {};
    try {
      body = await request.json();
    } catch {
      // body is optional — all fields are optional
    }

    const { trackingNumber, carrier, estimatedDelivery } = body;

    await connectDB();

    // 3. Find the order
    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // 4. Verify this manufacturer owns the order
    if (order.manufacturerId.toString() !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden: you are not the manufacturer for this order" },
        { status: 403 }
      );
    }

    // 5. Validate order is in a shippable state
    const shippableStatuses = ["in_production", "ready_to_ship"];
    if (!shippableStatuses.includes(order.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot ship an order with status "${order.status}". Order must be in_production or ready_to_ship.`,
        },
        { status: 400 }
      );
    }

    // 6. Update the order
    order.status = "shipped";
    order.shippingInfo = {
      trackingNumber: trackingNumber || null,
      carrier: carrier || null,
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
      shippedAt: new Date(),
    };
    await order.save();

    // 7. Notify the customer
    try {
      await notify.orderShipped(
        order.customerId.toString(),
        order._id.toString(),
        order.orderNumber
      );
    } catch (notifyErr) {
      console.warn("[Ship] Notification failed (non-fatal):", notifyErr.message);
    }

    // 8. Log to AdminLog
    try {
      await AdminLog.create({
        adminId: session.user.id,
        action: "order_status_updated",
        targetType: "order",
        targetId: order._id,
        description: `Order #${order.orderNumber} marked as shipped by manufacturer`,
        details: { trackingNumber, carrier, estimatedDelivery },
      });
    } catch (logErr) {
      console.warn("[Ship] AdminLog write failed (non-fatal):", logErr.message);
    }

    return NextResponse.json({
      success: true,
      message: "Order marked as shipped",
      order,
    });
  } catch (error) {
    console.error("[POST /api/orders/[id]/ship] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

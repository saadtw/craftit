import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import User from "@/models/User";

// PUT - Update order status (manufacturer actions)
export async function PUT(request, context) {
  const { id } = await context.params;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const {
      status,
      rejectionReason,
      estimatedDeliveryDate,
      trackingNumber,
      shippingMethod,
    } = body;

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.manufacturerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Capture original status before mutation
    const originalStatus = order.status;

    // Enforce valid transitions
    const validTransitions = {
      pending_acceptance: ["accepted", "cancelled"],
      accepted: ["in_production", "cancelled"],
      in_production: ["completed", "cancelled"],
    };

    const allowed = validTransitions[order.status];
    if (!allowed || !allowed.includes(status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from '${order.status}' to '${status}'`,
        },
        { status: 400 },
      );
    }

    // Apply transition
    order.status = status;

    if (status === "accepted") {
      order.manufacturerAcceptedAt = new Date();
      if (estimatedDeliveryDate) {
        order.estimatedDeliveryDate = new Date(estimatedDeliveryDate);
      }
      // If bid had proposed milestones, seed order milestones
      if (order.milestones.length === 0 && order.bidId) {
        try {
          const BidModel = (await import("@/models/Bid")).default;
          const bid = await BidModel.findById(order.bidId).lean();
          if (bid?.proposedMilestones?.length > 0) {
            order.milestones = bid.proposedMilestones.map((m) => ({
              name: m.name,
              description: m.description,
              status: "pending",
            }));
          }
        } catch {
          // Bid model unavailable — proceed without seeding milestones
        }
      }
    }

    if (status === "in_production") {
      if (shippingMethod) order.shippingMethod = shippingMethod;
    }

    if (status === "completed") {
      order.completedAt = new Date();
      order.paymentStatus = "captured";
      // Update manufacturer stats — totalOrders was already incremented on accept
      await User.findByIdAndUpdate(session.user.id, {
        $inc: {
          "stats.completedOrders": 1,
          "stats.totalRevenue": order.totalPrice,
        },
      });
    }

    if (status === "cancelled") {
      order.cancelledAt = new Date();
      order.cancelledBy = session.user.id;
      order.cancellationReason = rejectionReason || "Cancelled by manufacturer";
      if (originalStatus === "pending_acceptance") {
        order.rejectedAt = new Date();
        order.rejectionReason = rejectionReason || "Rejected by manufacturer";
      }
    }

    if (trackingNumber) order.trackingNumber = trackingNumber;

    await order.save();

    const updatedOrder = await Order.findById(id)
      .populate("customerId", "name email")
      .populate("manufacturerId", "name businessName email")
      .lean();

    return NextResponse.json({
      success: true,
      message: `Order status updated to '${status}'`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Order status update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update shipping/tracking info only (no status transition)
export async function PATCH(request, context) {
  const { id } = await context.params;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { trackingNumber, shippingMethod } = body;

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.manufacturerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
    if (shippingMethod !== undefined) order.shippingMethod = shippingMethod;

    await order.save();

    const updatedOrder = await Order.findById(id)
      .populate("customerId", "name email")
      .populate("manufacturerId", "name businessName email")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Shipping information updated",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Tracking update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

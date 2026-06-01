import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import RFQ from "@/models/RFQ";
import Bid from "@/models/Bid";
import { resolveRequestSession } from "@/lib/requestAuth";
import { notify } from "@/services/notificationService";

// POST /api/orders/[id]/manufacturer-cancel
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
        { error: "Only confirmed orders can be cancelled through this window." },
        { status: 400 },
      );
    }

    if (
      order.cancellationWindowExpiresAt &&
      new Date() > order.cancellationWindowExpiresAt
    ) {
      return NextResponse.json(
        { error: "Cancellation window has expired. Contact support to resolve this." },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason = (body.reason || "").trim();
    if (!reason) {
      return NextResponse.json(
        { error: "Cancellation reason is required." },
        { status: 400 },
      );
    }

    order.status = "cancellation_requested";
    order.cancellationReason = reason;
    order.cancellationRequestedBy = session.user.id;
    order.cancellationRequestedAt = new Date();
    await order.save();

    const alternativeBids = await Bid.find({
      rfqId: order.rfqId,
      _id: { $ne: order.bidId },
      status: { $in: ["rejected", "pending", "under_consideration"] },
    }).sort({ amount: 1 });

    await RFQ.findByIdAndUpdate(order.rfqId, {
      $set: { status: "active" },
      $unset: { acceptedBidId: "", closedAt: "" },
    });

    await Bid.updateMany(
      { rfqId: order.rfqId, _id: { $ne: order.bidId }, status: "rejected" },
      { $set: { status: "pending" }, $unset: { rejectedAt: "" } },
    );

    await notify.manufacturerCancelled(
      order.customerId,
      order._id,
      order.orderNumber,
      reason,
      alternativeBids.length,
    );

    return NextResponse.json({
      success: true,
      order,
      alternativeBidIds: alternativeBids.map((bid) => bid._id),
    });
  } catch (error) {
    console.error("Manufacturer cancel error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

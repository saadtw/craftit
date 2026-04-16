import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import RFQ from "@/models/RFQ";
import Bid from "@/models/Bid";
import CustomOrder from "@/models/CustomOrder";
import Order from "@/models/Order";
import { notify } from "@/services/notificationService";
import { resolveRequestSession } from "@/lib/requestAuth";

// POST /api/rfqs/[id]/accept-bid - Customer accepts a bid on their RFQ, creates order, notifies manufacturer
export async function POST(request, context) {
  const params = await context.params;
  const id = params.id;

  try {
    const session = await resolveRequestSession(request);

    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    // paymentIntentId comes from Stripe after the customer authorises their card
    // on the frontend before hitting this endpoint.
    const { bidId, paymentIntentId, deliveryAddress } = body;

    if (!bidId) {
      return NextResponse.json(
        { error: "Bid ID is required" },
        { status: 400 },
      );
    }

    // Get RFQ
    const rfq = await RFQ.findById(id);

    if (!rfq) {
      return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    }

    // Check ownership
    if (rfq.customerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if RFQ is active
    if (rfq.status !== "active") {
      return NextResponse.json({ error: "RFQ is not active" }, { status: 400 });
    }

    // Get the bid
    const bid = await Bid.findById(bidId);

    if (!bid) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    // Verify bid belongs to this RFQ
    if (bid.rfqId.toString() !== id) {
      return NextResponse.json(
        { error: "Bid does not belong to this RFQ" },
        { status: 400 },
      );
    }

    // Update bid status
    bid.status = "accepted";
    bid.acceptedAt = new Date();
    await bid.save();

    // Update RFQ status
    rfq.status = "bid_accepted";
    rfq.acceptedBidId = bidId;
    rfq.closedAt = new Date();
    await rfq.save();

    // Reject all other bids
    const rejectedBids = await Bid.find({
      rfqId: id,
      _id: { $ne: bidId },
      status: { $in: ["pending", "under_consideration"] },
    }).select("manufacturerId");

    await Bid.updateMany(
      {
        rfqId: id,
        _id: { $ne: bidId },
        status: { $in: ["pending", "under_consideration"] },
      },
      { status: "rejected", rejectedAt: new Date() },
    );

    // Notify rejected manufacturers
    for (const rejectedBid of rejectedBids) {
      await notify.bidRejected(
        rejectedBid.manufacturerId,
        rejectedBid._id,
        rfq.customOrderId?.title || "Custom Order",
      );
    }

    // Update custom order status
    await CustomOrder.findByIdAndUpdate(rfq.customOrderId, {
      status: "order_placed",
    });

    // Create Order
    const customOrder = await CustomOrder.findById(rfq.customOrderId);
    const order = await Order.create({
      customerId: session.user.id,
      manufacturerId: bid.manufacturerId,
      orderType: "rfq",
      rfqId: rfq._id,
      bidId: bid._id,
      productDetails: {
        name: customOrder.title,
        description: customOrder.description,
        specifications: {
          materialPreferences: customOrder.materialPreferences,
          model3D: customOrder.model3D,
          images: customOrder.images,
        },
      },
      quantity: customOrder.quantity,
      agreedPrice: bid.amount,
      totalPrice: bid.amount,
      timeline: bid.timeline,
      specialRequirements: customOrder.specialRequirements,
      designFiles: customOrder.model3D?.url ? [customOrder.model3D.url] : [],
      status: "pending_acceptance",
      // Payment — undefined if no Stripe paymentIntentId provided (cash/demo flow)
      paymentIntentId: paymentIntentId || undefined,
      paymentStatus: paymentIntentId ? "authorized" : "pending",
      deliveryAddress: deliveryAddress || {},
    });

    // Notify winning manufacturer
    await notify.orderPlaced(bid.manufacturerId, order._id, order.orderNumber);

    await notify.bidAccepted(
      bid.manufacturerId,
      bid._id,
      customOrder?.title || "Custom Order",
    );

    return NextResponse.json({
      success: true,
      message: "Bid accepted successfully",
      rfq,
      bid,
      order,
    });
  } catch (error) {
    console.error("Accept bid error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import RFQ from "@/models/RFQ";
import Bid from "@/models/Bid";
import CustomOrder from "@/models/CustomOrder";

export async function POST(request, context) {
  const params = await context.params;
  const id = params.id;

  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { bidId } = body;

    if (!bidId) {
      return NextResponse.json(
        { error: "Bid ID is required" },
        { status: 400 }
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
        { status: 400 }
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
    await Bid.updateMany(
      {
        rfqId: id,
        _id: { $ne: bidId },
        status: { $in: ["pending", "under_consideration"] },
      },
      {
        status: "rejected",
        rejectedAt: new Date(),
      }
    );

    // Update custom order status
    await CustomOrder.findByIdAndUpdate(rfq.customOrderId, {
      status: "order_placed",
    });

    return NextResponse.json({
      success: true,
      message: "Bid accepted successfully",
      rfq,
      bid,
    });
  } catch (error) {
    console.error("Accept bid error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

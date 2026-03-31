import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import RFQ from "@/models/RFQ";
import Bid from "@/models/Bid";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";

// GET  /api/rfqs/[id] - Get RFQ details
export async function GET(request, context) {
  const params = await context.params;
  const id = params.id;

  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid RFQ id" }, { status: 400 });
    }

    const rfq = await RFQ.findById(id)
      .populate({
        path: "customOrderId",
        select:
          "title description quantity materialPreferences colorSpecifications deadline budget model3D images specialRequirements",
      })
      .populate("customerId", "name email phone")
      .populate("acceptedBidId")
      .lean();

    if (!rfq) {
      return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    }

    // Get bids if customer or if manufacturer viewing their own bid
    let bids = [];
    if (
      session.user.role === "customer" &&
      rfq.customerId._id.toString() === session.user.id
    ) {
      bids = await Bid.find({ rfqId: id })
        .populate(
          "manufacturerId",
          "name businessName email verificationStatus stats",
        )
        .sort({ amount: 1 })
        .lean();
    } else if (session.user.role === "manufacturer") {
      // Manufacturer can only see their own bid
      bids = await Bid.find({
        rfqId: id,
        manufacturerId: session.user.id,
      })
        .populate("manufacturerId", "name businessName email")
        .lean();
    }

    return NextResponse.json({
      success: true,
      rfq,
      bids,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT  /api/rfqs/[id] - Update RFQ (cancel)
export async function PUT(request, context) {
  const params = await context.params;
  const id = params.id;

  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid RFQ id" }, { status: 400 });
    }

    const rfq = await RFQ.findById(id);

    if (!rfq) {
      return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    }

    // Check ownership
    if (rfq.customerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    if (body.action === "cancel") {
      // Can't cancel if bid already accepted
      if (rfq.status === "bid_accepted") {
        return NextResponse.json(
          { error: "Cannot cancel RFQ with accepted bid" },
          { status: 400 },
        );
      }

      rfq.status = "cancelled";
      rfq.cancelledAt = new Date();
      rfq.cancellationReason = body.reason || "Cancelled by customer";
      await rfq.save();

      return NextResponse.json({
        success: true,
        message: "RFQ cancelled",
        rfq,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

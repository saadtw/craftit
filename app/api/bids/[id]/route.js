import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Bid from "@/models/Bid";
import RFQ from "@/models/RFQ";
import User from "@/models/User";
import { notify } from "@/services/notificationService";

// GET /api/bids/[id] — get bid details with manufacturer info and RFQ context
export async function GET(request, context) {
  const params = await context.params;
  const id = params.id;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const bid = await Bid.findById(id)
      .populate(
        "manufacturerId",
        "businessName email stats.averageRating location verificationStatus businessLogo",
      )
      .populate({
        path: "rfqId",
        populate: { path: "customOrderId" },
      });

    if (!bid) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    const userId = session.user.id;
    const role = session.user.role;
    const isManufacturer =
      role === "manufacturer" && bid.manufacturerId._id.toString() === userId;
    const isCustomer =
      role === "customer" && bid.rfqId?.customerId?.toString() === userId;
    const isAdmin = role === "admin";

    if (!isManufacturer && !isCustomer && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, bid });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

/**
 * PUT /api/bids/[id]
 * Manufacturer updates their bid after chat negotiation.
 * The update is logged in the counterOffers array so the customer can
 * see the negotiation history on their bid detail page.
 */
export async function PUT(request, context) {
  const params = await context.params;
  const id = params.id;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const bid = await Bid.findOne({
      _id: id,
      manufacturerId: session.user.id,
    }).populate("rfqId");

    if (!bid) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    if (!["pending", "under_consideration"].includes(bid.status)) {
      return NextResponse.json(
        {
          error:
            "Cannot update a bid that has been accepted, rejected, or withdrawn",
        },
        { status: 400 },
      );
    }

    // Verify RFQ is still active
    const rfq = await RFQ.findById(bid.rfqId);
    if (!rfq || rfq.status !== "active") {
      return NextResponse.json(
        { error: "RFQ is no longer active" },
        { status: 400 },
      );
    }
    if (new Date() > rfq.endDate) {
      return NextResponse.json({ error: "RFQ has expired" }, { status: 400 });
    }

    const body = await request.json();
    const {
      amount,
      costBreakdown,
      timeline,
      proposedMilestones,
      materialsDescription,
      processDescription,
      paymentTerms,
      warrantyInfo,
      notes,
    } = body;

    // Only update fields that were explicitly provided
    if (amount !== undefined) bid.amount = amount;
    if (costBreakdown !== undefined) bid.costBreakdown = costBreakdown;
    if (timeline !== undefined) bid.timeline = timeline;
    if (proposedMilestones !== undefined)
      bid.proposedMilestones = proposedMilestones;
    if (materialsDescription !== undefined)
      bid.materialsDescription = materialsDescription;
    if (processDescription !== undefined)
      bid.processDescription = processDescription;
    if (paymentTerms !== undefined) bid.paymentTerms = paymentTerms;
    if (warrantyInfo !== undefined) bid.warrantyInfo = warrantyInfo;

    // Log update in counterOffers for audit trail / customer visibility
    bid.counterOffers.push({
      from: "manufacturer",
      amount: amount !== undefined ? amount : bid.amount,
      timeline: timeline !== undefined ? timeline : bid.timeline,
      notes: notes || "Bid updated after discussion",
      createdAt: new Date(),
    });

    await bid.save();

    // Notify the customer
    const manufacturer = await User.findById(session.user.id).select(
      "businessName",
    );
    await notify.bidUpdated(
      rfq.customerId,
      rfq._id,
      bid._id,
      manufacturer?.businessName || "Manufacturer",
    );

    return NextResponse.json({ success: true, bid });
  } catch (error) {
    console.error("PUT /api/bids/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

/**
 * PATCH /api/bids/[id]
 * Customer marks a bid as "under consideration" (shortlisting) or removes it.
 */
export async function PATCH(request, context) {
  const params = await context.params;
  const id = params.id;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const bid = await Bid.findById(id).populate("rfqId");
    if (!bid) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    if (bid.rfqId.customerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { action } = await request.json();

    if (action === "consider") {
      bid.status = "under_consideration";
      bid.markedForConsideration = true;
    } else if (action === "unconsider") {
      bid.status = "pending";
      bid.markedForConsideration = false;
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'consider' or 'unconsider'" },
        { status: 400 },
      );
    }

    await bid.save();
    return NextResponse.json({ success: true, bid });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

/**
 * DELETE /api/bids/[id]
 * Manufacturer withdraws their bid.
 */
export async function DELETE(request, context) {
  const params = await context.params;
  const id = params.id;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const bid = await Bid.findOne({
      _id: id,
      manufacturerId: session.user.id,
    });

    if (!bid) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    if (bid.status === "accepted") {
      return NextResponse.json(
        { error: "Cannot withdraw an accepted bid" },
        { status: 400 },
      );
    }

    bid.status = "withdrawn";
    bid.withdrawnAt = new Date();
    await bid.save();

    await RFQ.findByIdAndUpdate(bid.rfqId, { $inc: { bidsCount: -1 } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

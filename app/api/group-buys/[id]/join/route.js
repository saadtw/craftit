import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import GroupBuy from "@/models/GroupBuy";

// POST /api/group-buys/[id]/join - Customer joins a group buy
export async function POST(request, context) {
  const { id } = await context.params;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const groupBuy = await GroupBuy.findById(id);
    if (!groupBuy) {
      return NextResponse.json(
        { error: "Group buy not found" },
        { status: 404 },
      );
    }

    // Status checks
    if (groupBuy.status !== "active") {
      return NextResponse.json(
        { error: "This group buy is not currently active" },
        { status: 400 },
      );
    }
    if (new Date() > groupBuy.endDate) {
      return NextResponse.json(
        { error: "This group buy has ended" },
        { status: 400 },
      );
    }

    // Check if customer already joined
    const alreadyJoined = groupBuy.participants.some(
      (p) => p.customerId.toString() === session.user.id,
    );
    if (alreadyJoined) {
      return NextResponse.json(
        { error: "You have already joined this group buy" },
        { status: 400 },
      );
    }

    // Check max participants cap
    if (
      groupBuy.maxParticipants &&
      groupBuy.currentParticipantCount >= groupBuy.maxParticipants
    ) {
      return NextResponse.json(
        { error: "This group buy has reached maximum participants" },
        { status: 400 },
      );
    }

    const { quantity } = await request.json();
    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { error: "Quantity must be at least 1" },
        { status: 400 },
      );
    }

    // Calculate price AFTER adding this participant's quantity
    const newTotalQty = groupBuy.currentQuantity + quantity;
    let activePrice = groupBuy.basePrice;

    for (let i = groupBuy.tiers.length - 1; i >= 0; i--) {
      if (newTotalQty >= groupBuy.tiers[i].minQuantity) {
        activePrice = groupBuy.tiers[i].discountedPrice;
        break;
      }
    }

    const totalPrice = activePrice * quantity;

    // Add participant
    groupBuy.participants.push({
      customerId: session.user.id,
      quantity,
      unitPrice: activePrice,
      totalPrice,
      paymentStatus: "authorized", // real payment auth would happen here
    });

    // Recalculate cached fields
    groupBuy.recalculate();
    await groupBuy.save();

    return NextResponse.json({
      success: true,
      message: "Successfully joined group buy",
      unitPrice: activePrice,
      totalPrice,
      currentQuantity: groupBuy.currentQuantity,
      currentParticipantCount: groupBuy.currentParticipantCount,
      currentTierIndex: groupBuy.currentTierIndex,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/group-buys/[id]/join - Customer cancels their participation
export async function DELETE(request, context) {
  const { id } = await context.params;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const groupBuy = await GroupBuy.findById(id);
    if (!groupBuy) {
      return NextResponse.json(
        { error: "Group buy not found" },
        { status: 404 },
      );
    }

    // Can only cancel from an active campaign
    if (groupBuy.status !== "active") {
      return NextResponse.json(
        { error: "Cannot cancel participation — campaign is no longer active" },
        { status: 400 },
      );
    }

    const participantIndex = groupBuy.participants.findIndex(
      (p) => p.customerId.toString() === session.user.id,
    );

    if (participantIndex === -1) {
      return NextResponse.json(
        { error: "You are not a participant in this group buy" },
        { status: 404 },
      );
    }

    // TODO (Phase 8/Payments): trigger refund for participant's paymentIntentId here
    // const { paymentIntentId } = groupBuy.participants[participantIndex];

    // Remove participant
    groupBuy.participants.splice(participantIndex, 1);

    // Recalculate cached fields
    groupBuy.recalculate();
    await groupBuy.save();

    return NextResponse.json({
      success: true,
      message: "Participation cancelled successfully",
      currentQuantity: groupBuy.currentQuantity,
      currentParticipantCount: groupBuy.currentParticipantCount,
      currentTierIndex: groupBuy.currentTierIndex,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

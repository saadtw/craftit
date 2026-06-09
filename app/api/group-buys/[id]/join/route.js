import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import GroupBuy from "@/models/GroupBuy";
import { resolveRequestSession } from "@/lib/requestAuth";
import getStripe from "@/lib/stripe";
import { notify } from "@/services/notificationService";

const isStripeEnabled = () => !!process.env.STRIPE_SECRET_KEY;

// POST /api/group-buys/[id]/join - Customer joins a group buy
export async function POST(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { quantity, paymentIntentId } = body;
    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { error: "Quantity must be at least 1" },
        { status: 400 },
      );
    }

    if (isStripeEnabled()) {
      if (!paymentIntentId) {
        return NextResponse.json(
          { error: "Payment is required" },
          { status: 400 },
        );
      }
      try {
        const stripe = getStripe();
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== "requires_capture") {
          return NextResponse.json(
            { error: "Invalid payment status: " + paymentIntent.status },
            { status: 400 },
          );
        }
      } catch (e) {
        return NextResponse.json({ error: "Invalid payment intent" }, { status: 400 });
      }
    }

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

    let heldAmount = totalPrice;
    let remainingBalance = 0;
    let paymentStatus = "authorized";

    // Add participant
    groupBuy.participants.push({
      customerId: session.user.id,
      quantity,
      unitPrice: activePrice,
      totalPrice,
      heldAmount,
      remainingBalance,
      paymentStatus,
      status: "authorized",
      paymentIntentId,
    });

    // Capture tier before recalculation for comparison
    const prevTierIndex = groupBuy.currentTierIndex;

    // Recalculate cached fields
    groupBuy.recalculate();
    await groupBuy.save();

    // P1-D: Notify manufacturer that a new participant joined
    notify.groupBuyJoined(
      groupBuy.manufacturerId,
      groupBuy._id,
      groupBuy.currentParticipantCount,
    );

    // P1-D: Notify manufacturer if a new tier was just unlocked
    if (groupBuy.currentTierIndex > prevTierIndex && groupBuy.currentTierIndex >= 0) {
      const tier = groupBuy.tiers[groupBuy.currentTierIndex];
      notify.groupBuyTierReached(
        groupBuy.manufacturerId,
        groupBuy._id,
        tier.tierNumber,
        tier.discountPercent,
      );
    }

    // Trigger activation / funding if minParticipants reached
    if (groupBuy.currentParticipantCount === groupBuy.minParticipants) {
      // Notify all participants it's funded
      for (const p of groupBuy.participants) {
        notify.groupBuyFunded(p.customerId, groupBuy._id, groupBuy.title);
      }
    }

    // Automatically complete if maxParticipants reached
    if (groupBuy.maxParticipants && groupBuy.currentParticipantCount >= groupBuy.maxParticipants) {
      groupBuy.status = "payment_processing";
      groupBuy.endDate = new Date();
      await groupBuy.save();
      notify.groupBuyTierReached(
        groupBuy.manufacturerId,
        groupBuy._id,
        groupBuy.currentTierIndex + 1,
        groupBuy.tiers[groupBuy.currentTierIndex]?.discountPercent || 0,
      );
    }

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
    const session = await resolveRequestSession(request);
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

    const participant = groupBuy.participants[participantIndex];

    if (isStripeEnabled() && participant.paymentIntentId) {
      try {
        const stripe = getStripe();
        if (participant.paymentStatus === "captured") {
          await stripe.refunds.create({
            payment_intent: participant.paymentIntentId,
            amount: Math.round(participant.heldAmount * 100),
          });
        } else {
          await stripe.paymentIntents.cancel(participant.paymentIntentId);
        }
      } catch (stripeErr) {
        console.error("Stripe refund failed:", stripeErr.message);
        // Non-fatal, proceed with removing participant
      }
    }

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

// PATCH /api/group-buys/[id]/join - Customer updates their quantity
export async function PATCH(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { quantity } = await request.json();
    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { error: "Quantity must be at least 1" },
        { status: 400 },
      );
    }

    const groupBuy = await GroupBuy.findById(id);
    if (!groupBuy) {
      return NextResponse.json(
        { error: "Group buy not found" },
        { status: 404 },
      );
    }

    if (groupBuy.status !== "active") {
      return NextResponse.json(
        { error: "Campaign is no longer active" },
        { status: 400 },
      );
    }

    const participant = groupBuy.participants.find(
      (p) => p.customerId.toString() === session.user.id,
    );

    if (!participant) {
      return NextResponse.json(
        { error: "You are not a participant" },
        { status: 404 },
      );
    }

    // Update quantity
    participant.quantity = quantity;

    // Recalculate everything
    groupBuy.recalculate();
    
    // Update unitPrice for this participant based on the new global state
    // (In a real scenario, this might depend on when they locked in, 
    // but here we sync it with current tier)
    participant.unitPrice = groupBuy.currentDiscountedPrice || groupBuy.basePrice;
    participant.totalPrice = participant.unitPrice * quantity;

    await groupBuy.save();

    return NextResponse.json({
      success: true,
      message: "Quantity updated successfully",
      newQuantity: quantity,
      unitPrice: participant.unitPrice,
      totalPrice: participant.totalPrice,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import GroupBuy from "@/models/GroupBuy";
import { resolveRequestSession } from "@/lib/requestAuth";
import { notify } from "@/services/notificationService";
import getStripe from "@/lib/stripe";

// PATCH /api/group-buys/[id]/status - Control campaign status: pause, resume, end_early
export async function PATCH(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "manufacturer") {
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
    if (groupBuy.manufacturerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { action } = await request.json();

    switch (action) {
      case "pause":
        if (groupBuy.status !== "active") {
          return NextResponse.json(
            { error: "Only active campaigns can be paused" },
            { status: 400 },
          );
        }
        groupBuy.status = "paused";
        break;

      case "resume":
        if (groupBuy.status !== "paused") {
          return NextResponse.json(
            { error: "Only paused campaigns can be resumed" },
            { status: 400 },
          );
        }
        groupBuy.status = "active";
        break;

      case "end_early":
        if (!["active", "paused"].includes(groupBuy.status)) {
          return NextResponse.json(
            { error: "Campaign is not active or paused" },
            { status: 400 },
          );
        }
        groupBuy.status = "payment_processing";
        groupBuy.endDate = new Date(); // set end to now
        break;

      case "cancel":
        if (!["active", "paused", "scheduled"].includes(groupBuy.status)) {
          return NextResponse.json(
            { error: "Campaign cannot be cancelled in its current state" },
            { status: 400 },
          );
        }
        groupBuy.status = "cancelled";
        groupBuy.cancelledAt = new Date();
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: pause, resume, end_early, cancel" },
          { status: 400 },
        );
    }

    await groupBuy.save();

    if (action === "cancel") {
      const productName = groupBuy.title || "Group Buy";
      const stripe = process.env.STRIPE_SECRET_KEY ? getStripe() : null;
      for (const participant of groupBuy.participants) {
        // Phase 5-E: Refund held funds
        if (stripe && participant.paymentIntentId) {
          try {
            if (participant.paymentStatus === "captured") {
              await stripe.refunds.create({
                payment_intent: participant.paymentIntentId,
                amount: Math.round(participant.heldAmount * 100),
              });
            } else {
              await stripe.paymentIntents.cancel(participant.paymentIntentId);
            }
          } catch (stripeErr) {
            console.error("Stripe refund failed during campaign cancel:", stripeErr.message);
          }
        }

        notify.groupBuyCancelled(
          participant.customerId,
          groupBuy._id,
          productName,
        );
      }
    }

    return NextResponse.json({
      success: true,
      status: groupBuy.status,
      message: `Campaign ${action.replace("_", " ")} successful`,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

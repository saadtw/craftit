import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import GroupBuy from "@/models/GroupBuy";
import Order from "@/models/Order";
import EscrowTransaction from "@/models/EscrowTransaction";
import getStripe from "@/lib/stripe";
import { notify } from "@/services/notificationService";

const isStripeEnabled = () => !!process.env.STRIPE_SECRET_KEY;

function retryDeadlineFrom(date) {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000);
}

async function createPaidParticipantOrders(groupBuy) {
  const productName = groupBuy.title || "Group Buy";

  for (let i = 0; i < groupBuy.participants.length; i++) {
    const participant = groupBuy.participants[i];
    if (participant.status !== "paid" || participant.orderId) continue;

    const order = await Order.create({
      orderType: "group_buy",
      groupBuyId: groupBuy._id,
      productId: groupBuy.productId,
      customerId: participant.customerId,
      manufacturerId: groupBuy.manufacturerId,
      quantity: participant.quantity,
      unitPrice: participant.unitPrice,
      totalPrice: participant.totalPrice,
      paymentIntentId: participant.paymentIntentId,
      paymentStatus: "held_in_escrow",
      status: "accepted",
    });

    groupBuy.participants[i].orderId = order._id;
    await notify.groupBuyCompleted(participant.customerId, groupBuy._id, productName);
  }
}

async function refundPaidParticipants(groupBuy, stripe, reason) {
  const productName = groupBuy.title || "Group Buy";

  for (const participant of groupBuy.participants) {
    if (participant.status === "paid" && stripe && participant.paymentIntentId) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: participant.paymentIntentId,
        });
        await EscrowTransaction.create({
          orderId: participant.orderId || groupBuy._id,
          customerId: participant.customerId,
          manufacturerId: groupBuy.manufacturerId,
          amount: participant.totalPrice,
          type: "refunded",
          reference: refund.id,
          notes: reason,
        }).catch(() => {});
      } catch (stripeErr) {
        console.error("Group buy refund failed:", stripeErr.message);
      }
    }
    participant.status = "cancelled";
    participant.paymentStatus = "refunded";
    await notify.groupBuyCancelled(participant.customerId, groupBuy._id, productName);
  }
}

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const now = new Date();
    const stripe = isStripeEnabled() ? getStripe() : null;

    await GroupBuy.updateMany(
      { status: "active", endDate: { $lte: now } },
      { $set: { status: "payment_processing" } },
    );

    const groupBuys = await GroupBuy.find({
      status: { $in: ["payment_processing", "mvq_review"] },
    });

    const results = { processed: 0, completed: 0, mvqReview: 0, cancelled: 0 };

    for (const groupBuy of groupBuys) {
      results.processed++;

      if (
        groupBuy.status === "mvq_review" &&
        groupBuy.mvqReviewExpiresAt &&
        groupBuy.mvqReviewExpiresAt <= now
      ) {
        await refundPaidParticipants(groupBuy, stripe, "MVQ review expired");
        groupBuy.status = "cancelled";
        groupBuy.cancelReason = "minimum_viable_quantity_not_met";
        groupBuy.cancelledAt = now;
        await groupBuy.save();
        results.cancelled++;
        continue;
      }

      if (groupBuy.status === "mvq_review") {
        results.mvqReview++;
        continue;
      }

      let hasOpenRetryWindow = false;

      for (const participant of groupBuy.participants) {
        if (participant.status === "authorized") {
          participant.captureAttemptedAt = now;
          if (!stripe || !participant.paymentIntentId) {
            participant.status = "paid";
            participant.paymentStatus = "captured";
          } else {
            try {
              await stripe.paymentIntents.capture(participant.paymentIntentId);
              participant.status = "paid";
              participant.paymentStatus = "captured";
              await EscrowTransaction.create([
                {
                  orderId: groupBuy._id,
                  customerId: participant.customerId,
                  manufacturerId: groupBuy.manufacturerId,
                  amount: participant.totalPrice,
                  type: "payment_received",
                  reference: participant.paymentIntentId,
                },
                {
                  orderId: groupBuy._id,
                  customerId: participant.customerId,
                  manufacturerId: groupBuy.manufacturerId,
                  amount: participant.totalPrice,
                  type: "held",
                  reference: participant.paymentIntentId,
                },
              ]).catch(() => {});
            } catch (stripeErr) {
              participant.status = "capture_failed";
              participant.captureFailedAt = now;
              participant.captureRetryDeadline = retryDeadlineFrom(now);
              hasOpenRetryWindow = true;
              await EscrowTransaction.create({
                orderId: groupBuy._id,
                customerId: participant.customerId,
                manufacturerId: groupBuy.manufacturerId,
                amount: participant.totalPrice,
                type: "capture_failed",
                reference: participant.paymentIntentId,
                notes: stripeErr.message,
              }).catch(() => {});
            }
          }
        } else if (
          participant.status === "capture_failed" &&
          participant.captureRetryDeadline
        ) {
          if (participant.captureRetryDeadline > now) {
            hasOpenRetryWindow = true;
          } else {
            if (stripe && participant.paymentIntentId) {
              try {
                await stripe.paymentIntents.cancel(participant.paymentIntentId);
              } catch (stripeErr) {
                console.error("Group buy failed auth cancel failed:", stripeErr.message);
              }
            }
            participant.status = "cancelled";
          }
        }
      }

      if (hasOpenRetryWindow) {
        await groupBuy.save();
        continue;
      }

      const paidQuantity = groupBuy.participants
        .filter((participant) => participant.status === "paid")
        .reduce((sum, participant) => sum + participant.quantity, 0);

      if (
        groupBuy.minimumViableQuantity > 0 &&
        paidQuantity < groupBuy.minimumViableQuantity
      ) {
        groupBuy.status = "mvq_review";
        groupBuy.mvqReviewExpiresAt = retryDeadlineFrom(now);
        await groupBuy.save();
        await notify.groupBuyTierReached(
          groupBuy.manufacturerId,
          groupBuy._id,
          0,
          0,
        );
        results.mvqReview++;
        continue;
      }

      await createPaidParticipantOrders(groupBuy);
      groupBuy.status = "completed";
      groupBuy.completedAt = now;
      await groupBuy.save();
      results.completed++;
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("complete-group-buys cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

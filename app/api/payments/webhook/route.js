import { NextResponse } from "next/server";
import getStripe from "@/lib/stripe";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import GroupBuy from "@/models/GroupBuy";
import EscrowTransaction from "@/models/EscrowTransaction";

/**
 * POST /api/payments/webhook
 *
 * Stripe sends signed events here for async payment updates.
 * Add STRIPE_WEBHOOK_SECRET to .env (from `stripe listen` in dev
 * or the Stripe dashboard webhook endpoint in prod).
 *
 * Key events handled:
 *  - payment_intent.succeeded         → mark order/group-buy payment as captured
 *  - payment_intent.payment_failed    → mark order payment as failed
 *  - charge.refunded                  → confirm refund applied
 */
export async function POST(request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 },
    );
  }

  await connectDB();

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object;
      // Only promote to "captured" if the order isn't already in a later
      // escrow state (avoids race with the API-side capture path).
      await Order.updateMany(
        {
          paymentIntentId: pi.id,
          paymentStatus: {
            $nin: ["captured", "held_in_escrow", "release_requested", "released", "refunded", "partially_refunded"],
          },
        },
        { paymentStatus: "captured" },
      );
      break;
    }

    case "payment_intent.canceled": {
      const pi = event.data.object;
      await Order.updateMany(
        { paymentIntentId: pi.id, paymentStatus: { $ne: "captured" } },
        { paymentStatus: "refunded" },
      );
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object;
      await Order.updateMany(
        { paymentIntentId: charge.payment_intent, paymentStatus: { $ne: "refunded" } },
        { paymentStatus: "refunded", refundAmount: charge.amount_refunded / 100 }
      );
      break;
    }

    case "transfer.created": {
      const transfer = event.data.object;
      const PaymentReleaseRequest = (await import("@/models/PaymentReleaseRequest")).default;
      const release = await PaymentReleaseRequest.findOne({ transferId: transfer.id });
      if (release && release.status !== "approved") {
        release.status = "approved";
        release.resolvedAt = new Date();
        await release.save();
        const order = await Order.findById(release.orderId);
        if (order) {
          order.paymentStatus = "released";
          await order.save();
          await EscrowTransaction.create({
            orderId: order._id,
            customerId: order.customerId,
            manufacturerId: order.manufacturerId,
            amount: release.amount,
            type: "released",
            reference: transfer.id,
          });
        }
      }
      break;
    }

    case "transfer.failed": {
      const transfer = event.data.object;
      const PaymentReleaseRequest = (await import("@/models/PaymentReleaseRequest")).default;
      const release = await PaymentReleaseRequest.findOne({ transferId: transfer.id });
      if (release) {
        release.status = "rejected"; // or a new status "failed"
        release.resolvedAt = new Date();
        await release.save();
        // Notify admin or manufacturer here in a real scenario
      }
      break;
    }

    case "account.updated": {
      const account = event.data.object;
      // Log Connect account updates for observability. The User model does
      // not persist a separate onboarding status — the live account status
      // is always fetched from Stripe when needed via the payouts/connect API.
      console.log(
        `Stripe Connect account ${account.id}: details_submitted=${account.details_submitted}, payouts_enabled=${account.payouts_enabled}`,
      );
      break;
    }

    case "payment_intent.requires_action": {
      const pi = event.data.object;
      // In a real app, notify customer to complete 3D Secure
      console.log(`Payment Intent ${pi.id} requires action: 3D Secure.`);
      break;
    }

    default:
      // Ignore unhandled event types
      break;
  }

  return NextResponse.json({ received: true });
}

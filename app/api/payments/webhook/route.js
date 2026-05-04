import { NextResponse } from "next/server";
import getStripe from "@/lib/stripe";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import GroupBuy from "@/models/GroupBuy";

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
      // Update any order that has this paymentIntentId
      await Order.updateMany(
        { paymentIntentId: pi.id },
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
      const User = (await import("@/models/User")).default;
      const user = await User.findOne({ stripeConnectAccountId: account.id });
      if (user) {
        user.onboardingStatus = account.details_submitted ? "completed" : "pending";
        await user.save();
      }
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

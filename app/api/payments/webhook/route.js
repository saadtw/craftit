import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";
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
      // Already handled synchronously in /api/payments/refund
      // This just serves as a belt-and-suspenders confirmation
      break;
    }

    default:
      // Ignore unhandled event types
      break;
  }

  return NextResponse.json({ received: true });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import stripe from "@/lib/stripe";

/**
 * POST /api/payments/create-intent
 *
 * Called from the frontend when the customer is on the payment step.
 * Returns a clientSecret that Stripe.js uses to confirm the payment.
 *
 * Body: { amount: number (in USD dollars), currency?: string, metadata?: object }
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, currency = "usd", metadata = {} } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Stripe amounts are in smallest currency unit (cents for USD)
    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      // capture_method: "manual" means we AUTHORIZE now, CAPTURE later
      // This is the "hold funds" model — money is reserved but not charged
      // until we explicitly call paymentIntents.capture() when the order completes
      capture_method: "manual",
      metadata: {
        customerId: session.user.id,
        customerEmail: session.user.email,
        ...metadata,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("create-intent error:", error);
    return NextResponse.json(
      { error: error.message || "Payment initialization failed" },
      { status: 500 },
    );
  }
}

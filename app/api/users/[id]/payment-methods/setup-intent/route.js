import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import getStripe from "@/lib/stripe";
import { resolveRequestSession } from "@/lib/requestAuth";

const ALLOWED_ROLES = ["customer"];

async function getAuthorizedUser(paramsPromise) {
  const params = await paramsPromise;
  const session = await resolveRequestSession(request);

  if (!session || !session.user) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  if (session.user.id !== params.id) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      ),
    };
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "Saved card payment methods are available for customers only",
        },
        { status: 403 },
      ),
    };
  }

  await connectDB();

  const user = await User.findById(params.id).select(
    "role email name stripeCustomerId",
  );

  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      ),
    };
  }

  return { user };
}

async function ensureStripeCustomer(stripe, user) {
  if (user.stripeCustomerId) {
    try {
      await stripe.customers.retrieve(user.stripeCustomerId);
      return user.stripeCustomerId;
    } catch {
      // Continue and create a fresh customer record below.
    }
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: String(user._id), role: user.role },
  });

  user.stripeCustomerId = customer.id;
  await user.save();

  return customer.id;
}

// POST /api/users/[id]/payment-methods/setup-intent - create setup intent for Stripe Elements card save
export async function POST(_request, { params }) {
  try {
    const { user, errorResponse } = await getAuthorizedUser(params);
    if (errorResponse) return errorResponse;

    const stripe = getStripe();
    const stripeCustomerId = await ensureStripeCustomer(stripe, user);

    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: {
        userId: String(user._id),
        role: user.role,
      },
    });

    return NextResponse.json({
      success: true,
      setupIntentId: setupIntent.id,
      clientSecret: setupIntent.client_secret,
    });
  } catch (error) {
    console.error("Payment setup-intent error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initialize payment method setup" },
      { status: 500 },
    );
  }
}

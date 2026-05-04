import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import getStripe from "@/lib/stripe";
import { resolveRequestSession } from "@/lib/requestAuth";

const ALLOWED_ROLES = ["manufacturer"];

function normalizeCountryCode(rawCountry) {
  const country = String(rawCountry || "").trim();

  if (country.length === 2) {
    return country.toUpperCase();
  }

  const fallback = String(
    process.env.STRIPE_CONNECT_DEFAULT_COUNTRY || "US",
  ).toUpperCase();

  return fallback.length === 2 ? fallback : "US";
}

async function getAuthorizedManufacturer(request, paramsPromise) {
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
          error: "Payout onboarding is available for manufacturers only",
        },
        { status: 403 },
      ),
    };
  }

  await connectDB();
  const user = await User.findById(params.id).select(
    "role email name businessName businessAddress stripeConnectAccountId",
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

function connectStatusResponse(account, accountId) {
  return {
    hasAccount: true,
    stripeConnectAccountId: accountId,
    detailsSubmitted: Boolean(account.details_submitted),
    chargesEnabled: Boolean(account.charges_enabled),
    payoutsEnabled: Boolean(account.payouts_enabled),
    requirementsDue: account.requirements?.currently_due || [],
    disabledReason: account.requirements?.disabled_reason || null,
    onboardingComplete: Boolean(
      account.details_submitted && account.payouts_enabled,
    ),
  };
}

async function ensureConnectAccount(stripe, user) {
  if (user.stripeConnectAccountId) {
    try {
      const account = await stripe.accounts.retrieve(
        user.stripeConnectAccountId,
      );
      return { account, accountId: user.stripeConnectAccountId };
    } catch {
      // If the stored account is not retrievable, create a replacement account.
    }
  }

  const account = await stripe.accounts.create({
    type: "express",
    country: normalizeCountryCode(user.businessAddress?.country),
    email: user.email,
    business_type: user.businessName ? "company" : "individual",
    company: user.businessName
      ? {
          name: user.businessName,
        }
      : undefined,
    metadata: {
      userId: String(user._id),
      role: user.role,
    },
    capabilities: {
      transfers: {
        requested: true,
      },
    },
  });

  user.stripeConnectAccountId = account.id;
  await user.save();

  return { account, accountId: account.id };
}

function getBaseUrl(request) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    new URL(request.url).origin
  );
}

export async function GET(request, { params }) {
  try {
    const { user, errorResponse } = await getAuthorizedManufacturer(request, params);
    if (errorResponse) return errorResponse;

    if (!user.stripeConnectAccountId) {
      return NextResponse.json({
        success: true,
        hasAccount: false,
        onboardingComplete: false,
      });
    }

    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);

    return NextResponse.json({
      success: true,
      ...connectStatusResponse(account, user.stripeConnectAccountId),
    });
  } catch (error) {
    console.error("Stripe Connect status error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payout onboarding status" },
      { status: 500 },
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { user, errorResponse } = await getAuthorizedManufacturer(request, params);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "onboard")
      .trim()
      .toLowerCase();

    const stripe = getStripe();
    const { account, accountId } = await ensureConnectAccount(stripe, user);

    if (action === "dashboard") {
      const loginLink = await stripe.accounts.createLoginLink(accountId);
      return NextResponse.json({
        success: true,
        url: loginLink.url,
        ...connectStatusResponse(account, accountId),
      });
    }

    if (action !== "onboard") {
      return NextResponse.json(
        { success: false, error: "Unsupported action" },
        { status: 400 },
      );
    }

    const baseUrl = getBaseUrl(request).replace(/\/$/, "");
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/manufacturer/settings?tab=payouts&connect=refresh`,
      return_url: `${baseUrl}/manufacturer/settings?tab=payouts&connect=return`,
      type: "account_onboarding",
    });

    return NextResponse.json({
      success: true,
      url: accountLink.url,
      ...connectStatusResponse(account, accountId),
    });
  } catch (error) {
    console.error("Stripe Connect onboarding error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initialize payout onboarding" },
      { status: 500 },
    );
  }
}

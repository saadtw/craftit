import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import getStripe from "@/lib/stripe";

const ALLOWED_ROLES = ["customer"];
const MAX_PAYMENT_METHODS = 8;

function normalizeBillingAddress(input) {
  return {
    line1: String(input?.line1 || "").trim(),
    city: String(input?.city || "").trim(),
    state: String(input?.state || "").trim(),
    country: String(input?.country || "").trim(),
    postalCode: String(input?.postalCode || "").trim(),
  };
}

function paymentMethodsForResponse(methods = []) {
  return methods.map((method) => ({
    _id: method._id,
    type: method.type,
    purpose: method.purpose,
    provider: method.provider,
    brand: method.brand,
    holderName: method.holderName,
    nickname: method.nickname,
    last4: method.last4,
    expMonth: method.expMonth,
    expYear: method.expYear,
    billingAddress: method.billingAddress,
    isDefault: Boolean(method.isDefault),
    createdAt: method.createdAt,
  }));
}

async function getAuthorizedUser(paramsPromise) {
  const params = await paramsPromise;
  const session = await getServerSession(authOptions);

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
    "paymentMethods role email name stripeCustomerId",
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

// GET /api/users/[id]/payment-methods - Get all saved payment methods for the user
export async function GET(_request, { params }) {
  try {
    const { user, errorResponse } = await getAuthorizedUser(params);
    if (errorResponse) return errorResponse;

    return NextResponse.json({
      success: true,
      paymentMethods: paymentMethodsForResponse(user.paymentMethods || []),
    });
  } catch (error) {
    console.error("Payment methods GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payment methods" },
      { status: 500 },
    );
  }
}

// POST /api/users/[id]/payment-methods - Add a new payment method for the user
export async function POST(request, { params }) {
  try {
    const { user, errorResponse } = await getAuthorizedUser(params);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const setupIntentId = String(body.setupIntentId || "").trim();
    const holderName = String(body.holderName || "").trim();
    const nickname = String(body.nickname || "").trim();

    if (!setupIntentId) {
      return NextResponse.json(
        {
          success: false,
          error: "setupIntentId is required to save a Stripe payment method",
        },
        { status: 400 },
      );
    }

    const methods = Array.isArray(user.paymentMethods)
      ? user.paymentMethods
      : [];
    if (methods.length >= MAX_PAYMENT_METHODS) {
      return NextResponse.json(
        {
          success: false,
          error: `You can save up to ${MAX_PAYMENT_METHODS} payment methods`,
        },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    const stripeCustomerId = await ensureStripeCustomer(stripe, user);

    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId, {
      expand: ["payment_method"],
    });

    if (setupIntent.status !== "succeeded") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Setup intent is not completed. Please try adding the card again.",
        },
        { status: 400 },
      );
    }

    if (
      setupIntent.customer &&
      String(setupIntent.customer) !== String(stripeCustomerId)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "This card setup does not belong to this user",
        },
        { status: 403 },
      );
    }

    let paymentMethod = setupIntent.payment_method;

    if (typeof paymentMethod === "string") {
      paymentMethod = await stripe.paymentMethods.retrieve(paymentMethod);
    }

    if (!paymentMethod || paymentMethod.type !== "card") {
      return NextResponse.json(
        {
          success: false,
          error: "Only Stripe card payment methods are supported",
        },
        { status: 400 },
      );
    }

    if (paymentMethod.customer && paymentMethod.customer !== stripeCustomerId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This payment method is attached to a different Stripe customer",
        },
        { status: 403 },
      );
    }

    if (!paymentMethod.customer) {
      paymentMethod = await stripe.paymentMethods.attach(paymentMethod.id, {
        customer: stripeCustomerId,
      });
    }

    const alreadySaved = methods.some(
      (method) => method.stripePaymentMethodId === paymentMethod.id,
    );
    if (alreadySaved) {
      return NextResponse.json({
        success: true,
        paymentMethods: paymentMethodsForResponse(user.paymentMethods),
      });
    }

    const card = paymentMethod.card || {};
    const billing = paymentMethod.billing_details || {};

    const shouldBeDefault = Boolean(body.isDefault) || methods.length === 0;
    if (shouldBeDefault) {
      methods.forEach((m) => {
        m.isDefault = false;
      });
    }

    methods.push({
      type: "card",
      purpose: "spending",
      provider: "stripe",
      stripePaymentMethodId: paymentMethod.id,
      brand: card.brand || "card",
      holderName: holderName || billing.name || user.name || "",
      nickname,
      last4: card.last4,
      expMonth: card.exp_month,
      expYear: card.exp_year,
      billingAddress: normalizeBillingAddress(billing.address),
      isDefault: shouldBeDefault,
      createdAt: new Date(),
    });

    user.paymentMethods = methods;
    await user.save();

    if (shouldBeDefault) {
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethod.id },
      });
    }

    return NextResponse.json({
      success: true,
      paymentMethods: paymentMethodsForResponse(user.paymentMethods),
    });
  } catch (error) {
    console.error("Payment methods POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add payment method" },
      { status: 500 },
    );
  }
}

// PATCH /api/users/[id]/payment-methods - Set a payment method as default
export async function PATCH(request, { params }) {
  try {
    const { user, errorResponse } = await getAuthorizedUser(params);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const methodId = String(body.paymentMethodId || "").trim();

    if (!methodId) {
      return NextResponse.json(
        { success: false, error: "paymentMethodId is required" },
        { status: 400 },
      );
    }

    const methods = Array.isArray(user.paymentMethods)
      ? user.paymentMethods
      : [];
    const selectedMethod = methods.find(
      (method) => String(method._id) === methodId,
    );

    if (!selectedMethod) {
      return NextResponse.json(
        { success: false, error: "Payment method not found" },
        { status: 404 },
      );
    }

    user.paymentMethods = methods.map((method) => ({
      ...method.toObject(),
      isDefault: String(method._id) === methodId,
    }));

    await user.save();

    if (
      selectedMethod.provider === "stripe" &&
      selectedMethod.stripePaymentMethodId &&
      user.stripeCustomerId
    ) {
      const stripe = getStripe();
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: selectedMethod.stripePaymentMethodId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      paymentMethods: paymentMethodsForResponse(user.paymentMethods),
    });
  } catch (error) {
    console.error("Payment methods PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update payment method" },
      { status: 500 },
    );
  }
}

// DELETE /api/users/[id]/payment-methods - Remove a payment method from the user
export async function DELETE(request, { params }) {
  try {
    const { user, errorResponse } = await getAuthorizedUser(params);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const methodId = String(searchParams.get("paymentMethodId") || "").trim();

    if (!methodId) {
      return NextResponse.json(
        { success: false, error: "paymentMethodId is required" },
        { status: 400 },
      );
    }

    const methods = Array.isArray(user.paymentMethods)
      ? user.paymentMethods
      : [];
    const existing = methods.find((method) => String(method._id) === methodId);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Payment method not found" },
        { status: 404 },
      );
    }

    user.paymentMethods = methods.filter(
      (method) => String(method._id) !== methodId,
    );

    const stripe = getStripe();
    if (existing.provider === "stripe" && existing.stripePaymentMethodId) {
      try {
        await stripe.paymentMethods.detach(existing.stripePaymentMethodId);
      } catch (detachError) {
        console.warn("Failed to detach Stripe payment method", detachError);
      }
    }

    if (existing.isDefault && user.paymentMethods.length > 0) {
      user.paymentMethods[0].isDefault = true;
    }

    await user.save();

    if (user.stripeCustomerId) {
      const newDefault = (user.paymentMethods || []).find(
        (method) => method.isDefault,
      );
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method:
            newDefault?.provider === "stripe"
              ? newDefault.stripePaymentMethodId
              : null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      paymentMethods: paymentMethodsForResponse(user.paymentMethods),
    });
  } catch (error) {
    console.error("Payment methods DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove payment method" },
      { status: 500 },
    );
  }
}

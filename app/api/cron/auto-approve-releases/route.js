import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PaymentReleaseRequest from "@/models/PaymentReleaseRequest";
import Order from "@/models/Order";
import User from "@/models/User";
import getStripe from "@/lib/stripe";
import { notify } from "@/services/notificationService";

// GET /api/cron/auto-approve-releases
export async function GET(request) {
  // Add simple authentication for cron (e.g., matching a secret)
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
    const expiredRequests = await PaymentReleaseRequest.find({
      status: "pending",
      expiresAt: { $lte: now },
    });

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    for (const release of expiredRequests) {
      results.processed++;

      try {
        const order = await Order.findById(release.orderId);
        if (!order) throw new Error("Order not found");

        const manufacturer = await User.findById(release.manufacturerId);
        if (!manufacturer) throw new Error("Manufacturer not found");

        // Execute Stripe Transfer
        if (process.env.STRIPE_SECRET_KEY) {
          if (!manufacturer.stripeConnectAccountId) {
            throw new Error("Manufacturer has no Stripe Connect account");
          }

          const stripe = getStripe();
          const transfer = await stripe.transfers.create({
            amount: Math.round(release.amount * 100),
            currency: "usd",
            destination: manufacturer.stripeConnectAccountId,
          });

          release.transferId = transfer.id;
        }

        release.status = "auto_approved";
        release.resolvedAt = now;
        await release.save();

        // Notify both parties
        await notify.paymentReleaseAutoApproved?.(
          order.customerId,
          order.manufacturerId,
          order._id,
          order.orderNumber,
          release.amount
        );

        results.succeeded++;
      } catch (err) {
        console.error(`Auto-approve failed for release ${release._id}:`, err);
        results.failed++;
        results.errors.push({ id: release._id, message: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} requests`,
      results,
    });
  } catch (error) {
    console.error("Cron auto-approve-releases error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

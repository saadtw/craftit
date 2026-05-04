import { NextResponse } from "next/server";
import { resolveRequestSession } from "@/lib/requestAuth";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import User from "@/models/User";
import PaymentReleaseRequest from "@/models/PaymentReleaseRequest";
import { notify } from "@/services/notificationService";
import getStripe from "@/lib/stripe";

export async function PATCH(request, context) {
  const { id, releaseId } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.customerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const release = await PaymentReleaseRequest.findById(releaseId);
    if (!release) {
      return NextResponse.json({ error: "Release request not found" }, { status: 404 });
    }

    if (release.orderId.toString() !== id) {
      return NextResponse.json({ error: "Release request does not match order" }, { status: 400 });
    }

    if (release.status !== "pending") {
      return NextResponse.json(
        { error: `Release request already processed (${release.status})` },
        { status: 400 }
      );
    }

    const { action } = await request.json(); // "approve" or "reject"
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const manufacturer = await User.findById(release.manufacturerId);

    if (action === "approve") {
      // Create Stripe transfer
      if (process.env.STRIPE_SECRET_KEY) {
        if (!manufacturer.stripeConnectAccountId) {
          return NextResponse.json(
            { error: "Manufacturer has not configured their Stripe Connect account." },
            { status: 400 }
          );
        }

        try {
          const stripe = getStripe();
          const transfer = await stripe.transfers.create({
            amount: Math.round(release.amount * 100),
            currency: "usd",
            destination: manufacturer.stripeConnectAccountId,
          });
          release.transferId = transfer.id;
        } catch (stripeErr) {
          console.error("Stripe transfer failed:", stripeErr);
          return NextResponse.json(
            { error: "Stripe transfer failed: " + stripeErr.message },
            { status: 500 }
          );
        }
      }

      release.status = "approved";
      release.resolvedAt = new Date();
      await release.save();

      // Notify manufacturer
      await notify.paymentReleaseApproved?.(
        release.manufacturerId,
        order._id,
        order.orderNumber,
        release.amount
      );
    } else if (action === "reject") {
      release.status = "rejected";
      release.resolvedAt = new Date();
      await release.save();

      // Notify manufacturer
      await notify.paymentReleaseRejected?.(
        release.manufacturerId,
        order._id,
        order.orderNumber,
        release.amount
      );
    }

    return NextResponse.json({
      success: true,
      message: `Payment release ${action}d successfully`,
      release,
    });
  } catch (error) {
    console.error("Update payment release error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import PaymentReleaseRequest from "@/models/PaymentReleaseRequest";
import EscrowTransaction from "@/models/EscrowTransaction";
import User from "@/models/User";
import getStripe from "@/lib/stripe";
import { resolveRequestSession } from "@/lib/requestAuth";
import { notify } from "@/services/notificationService";

export async function PATCH(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const release = await PaymentReleaseRequest.findById(id);
    if (!release) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    const order = await Order.findById(release.orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = await request.json();
    const { action, payoutMethod, externalReferenceId, adminNote, amount } = body;
    const releaseAmount = amount || release.amount;

    if (action === "stripe_transfer") {
      const manufacturer = await User.findById(release.manufacturerId).select(
        "stripeConnectAccountId",
      );
      if (!manufacturer?.stripeConnectAccountId) {
        return NextResponse.json(
          { error: "Manufacturer has no Stripe Connect account." },
          { status: 400 },
        );
      }
      try {
        const stripe = getStripe();
        const transfer = await stripe.transfers.create({
          amount: Math.round(releaseAmount * 100),
          currency: "usd",
          destination: manufacturer.stripeConnectAccountId,
          transfer_group: order._id.toString(),
        });
        release.payoutMethod = "stripe_connect";
        release.transferId = transfer.id;
      } catch (stripeErr) {
        return NextResponse.json(
          { error: "Stripe transfer failed: " + stripeErr.message },
          { status: 500 },
        );
      }
    } else if (action === "mark_paid") {
      if (!["bank_transfer", "jazzcash", "easypaisa", "manual"].includes(payoutMethod)) {
        return NextResponse.json(
          { error: "Invalid payout method." },
          { status: 400 },
        );
      }
      release.payoutMethod = payoutMethod;
      release.externalReferenceId = externalReferenceId || undefined;
      release.adminNote = adminNote || undefined;
    } else {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    release.status = "approved";
    release.paidAt = new Date();
    release.resolvedAt = release.resolvedAt || release.paidAt;
    order.paymentStatus = "released";

    await Promise.all([release.save(), order.save()]);

    await EscrowTransaction.create({
      orderId: order._id,
      customerId: order.customerId,
      manufacturerId: order.manufacturerId,
      amount: releaseAmount,
      type: "released",
      reference: release.transferId || externalReferenceId || release._id.toString(),
      createdBy: session.user.id,
      notes: adminNote,
    });

    await notify.paymentReceived(
      order.manufacturerId,
      order._id,
      order.orderNumber,
      releaseAmount,
    );

    return NextResponse.json({ success: true, release });
  } catch (error) {
    console.error("Admin escrow release patch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

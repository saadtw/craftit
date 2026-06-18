import { NextResponse } from "next/server";
import { resolveRequestSession } from "@/lib/requestAuth";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import PaymentReleaseRequest from "@/models/PaymentReleaseRequest";
import EscrowTransaction from "@/models/EscrowTransaction";
import { notify } from "@/services/notificationService";

export async function POST(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.manufacturerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (
      !["captured", "held_in_escrow", "authorized", "release_requested"].includes(
        order.paymentStatus,
      )
    ) {
      return NextResponse.json(
        { error: "Payment has not been captured yet or is invalid." },
        { status: 400 }
      );
    }

    const { amount, reason, proofUrls } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    // Calculate how much has already been released/requested
    const existingRequests = await PaymentReleaseRequest.find({
      orderId: id,
      status: { $in: ["pending", "approved", "auto_approved"] },
    });

    const requestedAmount = existingRequests.reduce(
      (sum, req) => sum + req.amount,
      0
    );
    const availableAmount = order.totalPrice - requestedAmount;

    if (amount > availableAmount) {
      return NextResponse.json(
        {
          error: `Amount exceeds available balance. Max available: PKR ${availableAmount}`,
        },
        { status: 400 }
      );
    }

    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours from now

    const release = await PaymentReleaseRequest.create({
      orderId: order._id,
      manufacturerId: order.manufacturerId,
      customerId: order.customerId,
      amount,
      reason: reason.trim(),
      proofUrls: proofUrls || [],
      status: "pending",
      expiresAt,
    });

    order.paymentStatus = "release_requested";
    await order.save();

    await EscrowTransaction.create({
      orderId: order._id,
      customerId: order.customerId,
      manufacturerId: order.manufacturerId,
      amount: release.amount,
      type: "release_requested",
      reference: release._id.toString(),
    });

    // Notify customer
    await notify.paymentReleaseRequested?.(
      order.customerId,
      order._id,
      order.orderNumber,
      amount
    );

    return NextResponse.json({
      success: true,
      message: "Payment release requested",
      release,
    });
  } catch (error) {
    console.error("Create payment release error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

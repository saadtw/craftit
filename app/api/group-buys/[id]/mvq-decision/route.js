import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import GroupBuy from "@/models/GroupBuy";
import Order from "@/models/Order";
import EscrowTransaction from "@/models/EscrowTransaction";
import getStripe from "@/lib/stripe";
import { resolveRequestSession } from "@/lib/requestAuth";
import { notify } from "@/services/notificationService";

export async function POST(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const groupBuy = await GroupBuy.findById(id);
    if (!groupBuy) {
      return NextResponse.json({ error: "Group buy not found" }, { status: 404 });
    }
    if (groupBuy.manufacturerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (groupBuy.status !== "mvq_review") {
      return NextResponse.json(
        { error: "This group buy is not awaiting an MVQ decision." },
        { status: 400 },
      );
    }

    const { decision } = await request.json();
    if (!["fulfil", "cancel"].includes(decision)) {
      return NextResponse.json(
        { error: "Decision must be fulfil or cancel." },
        { status: 400 },
      );
    }

    const productName = groupBuy.title || "Group Buy";
    const stripe = process.env.STRIPE_SECRET_KEY ? getStripe() : null;

    if (decision === "fulfil") {
      for (let i = 0; i < groupBuy.participants.length; i++) {
        const participant = groupBuy.participants[i];
        if (participant.status === "paid" && !participant.orderId) {
          const order = await Order.create({
            orderType: "group_buy",
            groupBuyId: groupBuy._id,
            productId: groupBuy.productId,
            customerId: participant.customerId,
            manufacturerId: groupBuy.manufacturerId,
            quantity: participant.quantity,
            unitPrice: participant.unitPrice,
            totalPrice: participant.totalPrice,
            paymentIntentId: participant.paymentIntentId,
            paymentStatus: "held_in_escrow",
            status: "accepted",
          });
          groupBuy.participants[i].orderId = order._id;
          await notify.groupBuyCompleted(participant.customerId, groupBuy._id, productName);
        } else if (participant.status !== "paid") {
          participant.status = "cancelled";
          await notify.groupBuyCancelled(participant.customerId, groupBuy._id, productName);
        }
      }
      groupBuy.status = "completed";
      groupBuy.completedAt = new Date();
      await groupBuy.save();
      return NextResponse.json({ success: true, status: groupBuy.status });
    }

    for (const participant of groupBuy.participants) {
      if (participant.status === "paid" && stripe && participant.paymentIntentId) {
        try {
          const refund = await stripe.refunds.create({
            payment_intent: participant.paymentIntentId,
          });
          await EscrowTransaction.create({
            orderId: participant.orderId || groupBuy._id,
            customerId: participant.customerId,
            manufacturerId: groupBuy.manufacturerId,
            amount: participant.totalPrice,
            type: "refunded",
            reference: refund.id,
            createdBy: session.user.id,
          }).catch(() => {});
        } catch (stripeErr) {
          console.error("MVQ cancellation refund failed:", stripeErr.message);
        }
      }
      participant.status = "cancelled";
      participant.paymentStatus = "refunded";
      await notify.groupBuyCancelled(participant.customerId, groupBuy._id, productName);
    }

    groupBuy.status = "cancelled";
    groupBuy.cancelReason = "minimum_viable_quantity_not_met";
    groupBuy.cancelledAt = new Date();
    await groupBuy.save();

    return NextResponse.json({ success: true, status: groupBuy.status });
  } catch (error) {
    console.error("MVQ decision error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

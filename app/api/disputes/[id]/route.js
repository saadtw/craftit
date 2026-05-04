import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Dispute from "@/models/Dispute";
import Order from "@/models/Order";
import { notify } from "@/services/notificationService";
import { resolveRequestSession } from "@/lib/requestAuth";
import getStripe from "@/lib/stripe";
import mongoose from "mongoose";

// GET /api/disputes/[id] - get dispute details (only accessible to involved parties and admins)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const session = await resolveRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const dispute = await Dispute.findById(id)
      .populate("orderId")
      .populate("customerId", "name email profilePicture")
      .populate("manufacturerId", "businessName email businessLogo")
      .populate("resolvedBy", "name")
      .lean();

    if (!dispute) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check access
    const userId = session.user.id;
    const role = session.user.role;
    const hasAccess =
      role === "admin" ||
      dispute.customerId._id.toString() === userId ||
      dispute.manufacturerId._id.toString() === userId;

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, dispute });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH /api/disputes/[id]  — manufacturer response OR admin resolution
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const session = await resolveRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const dispute = await Dispute.findById(id);
    if (!dispute) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body;

    // ── Manufacturer submits response ──────────────────────────────────────
    if (action === "manufacturer_respond") {
      if (session.user.role !== "manufacturer") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (dispute.manufacturerId.toString() !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      dispute.manufacturerResponse = {
        comment: body.comment,
        evidence: body.evidence || [],
        respondedAt: new Date(),
      };
      dispute.status = "manufacturer_responded";
      await dispute.save();

      return NextResponse.json({ success: true, dispute });
    }

    // ── Admin review dispute ───────────────────────────────────────────────
    if (action === "admin_review") {
      if (session.user.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      dispute.status = "under_review";
      await dispute.save();

      const order = await Order.findById(dispute.orderId).select("orderNumber");

      await notify.disputeUnderReview(
        dispute.customerId,
        dispute.manufacturerId,
        dispute._id,
        order?.orderNumber || "Unknown"
      );

      return NextResponse.json({ success: true, dispute });
    }

    // ── Admin resolves dispute ─────────────────────────────────────────────
    if (action === "admin_resolve") {
      if (session.user.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { resolution, resolutionAmount, resolutionMessage, adminNotes } =
        body;

      if (!resolution || !resolutionMessage) {
        return NextResponse.json(
          { error: "resolution and resolutionMessage are required" },
          { status: 400 },
        );
      }

      dispute.resolution = resolution;
      dispute.resolutionAmount = resolutionAmount;
      dispute.resolutionMessage = resolutionMessage;
      dispute.adminNotes = adminNotes;
      dispute.resolvedBy = session.user.id;
      dispute.resolvedAt = new Date();
      dispute.status = "resolved";
      await dispute.save();

      // Restore order status and process Stripe payments
      const order = await Order.findById(dispute.orderId);
      if (order) {
        const stripe = process.env.STRIPE_SECRET_KEY ? getStripe() : null;
        if (resolution === "refund_customer") {
          // Stripe refund
          try {
            if (stripe && order.paymentIntentId && order.paymentStatus !== "refunded") {
              await stripe.refunds.create({
                payment_intent: order.paymentIntentId,
                amount: resolutionAmount ? Math.round(resolutionAmount * 100) : undefined
              });
            }
          } catch (stripeError) {
            console.error("Stripe refund failed:", stripeError);
            return NextResponse.json({ error: "Stripe refund failed: " + stripeError.message }, { status: 500 });
          }

          order.status = "cancelled";
          order.paymentStatus = "refunded";
          if (resolutionAmount) order.refundAmount = resolutionAmount;
        } else if (resolution === "side_with_manufacturer") {
          // Release held funds to manufacturer via Stripe Connect
          try {
            const manufacturer = await mongoose.model("User").findById(order.manufacturerId);
            if (stripe && manufacturer?.stripeConnectAccountId && order.paymentIntentId && order.paymentStatus === "captured") {
              const amountToTransfer = resolutionAmount || order.totalPrice;
              await stripe.transfers.create({
                amount: Math.round(amountToTransfer * 100),
                currency: "usd",
                destination: manufacturer.stripeConnectAccountId,
                transfer_group: order._id.toString(),
              });
            }
          } catch (stripeError) {
            console.error("Stripe transfer failed:", stripeError);
            return NextResponse.json({ error: "Stripe transfer failed: " + stripeError.message }, { status: 500 });
          }

          order.status = "completed";
        } else {
          // partial_resolution
          order.status = "completed";
        }
        await order.save();
      }

      // Notify both parties
      await notify.disputeResolved(
        dispute.customerId,
        dispute.manufacturerId,
        dispute._id,
        resolution,
        order?.orderNumber || "Unknown"
      );

      return NextResponse.json({ success: true, dispute });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/disputes/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Dispute from "@/models/Dispute";
import Order from "@/models/Order";
import { notify } from "@/services/notificationService";
import { resolveRequestSession } from "@/lib/requestAuth";

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

      // Restore order status
      const order = await Order.findById(dispute.orderId);
      if (order) {
        if (resolution === "refund_customer") {
          order.status = "cancelled";
          order.paymentStatus = "refunded";
          if (resolutionAmount) order.refundAmount = resolutionAmount;
        } else {
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
      );

      return NextResponse.json({ success: true, dispute });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/disputes/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

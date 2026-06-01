import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Dispute from "@/models/Dispute";
import Order from "@/models/Order";
import PaymentReleaseRequest from "@/models/PaymentReleaseRequest";
import { notify } from "@/services/notificationService";
import { resolveRequestSession } from "@/lib/requestAuth";

// POST /api/disputes  — customer or manufacturer opens a dispute
export async function POST(request) {
  try {
    const session = await resolveRequestSession(request);
    if (!session || !["customer", "manufacturer"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const {
      orderId,
      issueType,
      description,
      desiredResolution,
      customerEvidence,
    } = body;

    if (!orderId || !issueType || !description || !desiredResolution) {
      return NextResponse.json(
        {
          error:
            "orderId, issueType, description, and desiredResolution are required",
        },
        { status: 400 },
      );
    }

    // Verify order belongs to this user
    const query = { _id: orderId };
    if (session.user.role === "customer") {
      query.customerId = session.user.id;
    } else {
      query.manufacturerId = session.user.id;
    }
    const order = await Order.findOne(query);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const MANUFACTURER_ONLY_ISSUES = [
      "payment_release_rejected",
      "customer_unresponsive",
    ];
    const CUSTOMER_ONLY_ISSUES = [
      "item_not_received",
      "item_not_as_described",
      "quality_issue",
      "wrong_item",
      "damaged_item",
      "late_delivery",
      "refund_not_received",
    ];

    if (
      session.user.role === "customer" &&
      MANUFACTURER_ONLY_ISSUES.includes(issueType)
    ) {
      return NextResponse.json(
        { error: "Invalid issue type for customers." },
        { status: 400 },
      );
    }
    if (
      session.user.role === "manufacturer" &&
      CUSTOMER_ONLY_ISSUES.includes(issueType)
    ) {
      return NextResponse.json(
        { error: "Invalid issue type for manufacturers." },
        { status: 400 },
      );
    }

    if (session.user.role === "customer") {
      if (order.disputeWindowClosedAt && new Date() > order.disputeWindowClosedAt) {
        return NextResponse.json(
          {
            error:
              "Dispute window has closed. Disputes must be opened within 7 days of delivery.",
          },
          { status: 400 },
        );
      }
      if (order.status === "completed" && !order.deliveredAt) {
        const fallbackWindow = new Date(order.updatedAt);
        fallbackWindow.setDate(fallbackWindow.getDate() + 7);
        if (new Date() > fallbackWindow) {
          return NextResponse.json(
            { error: "Dispute window has closed." },
            { status: 400 },
          );
        }
      }
    }

    if (session.user.role === "manufacturer") {
      const rejectedRelease = await PaymentReleaseRequest.findOne({
        orderId,
        status: "rejected",
      }).sort({ resolvedAt: -1 });

      const expiredPendingRelease = await PaymentReleaseRequest.findOne({
        orderId,
        status: "pending",
        expiresAt: { $lt: new Date() },
      });

      if (!rejectedRelease && !expiredPendingRelease) {
        return NextResponse.json(
          {
            error:
              "Manufacturers can only open a dispute after a payment release request has been rejected or has expired without customer response.",
          },
          { status: 400 },
        );
      }

      const triggerDate =
        rejectedRelease?.resolvedAt || expiredPendingRelease?.expiresAt;
      if (triggerDate) {
        const disputeDeadline = new Date(triggerDate);
        disputeDeadline.setDate(disputeDeadline.getDate() + 3);
        if (new Date() > disputeDeadline) {
          return NextResponse.json(
            {
              error:
                "Manufacturer dispute window has closed (3 days after payment release rejection or expiry).",
            },
            { status: 400 },
          );
        }
      }
    }

    const allowedStatuses =
      session.user.role === "customer"
        ? ["confirmed", "accepted", "in_production", "shipped", "delivered", "completed"]
        : ["in_production", "shipped", "completed"];

    if (!allowedStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: "Cannot open a dispute for this order in its current status" },
        { status: 400 },
      );
    }

    // Check for existing open dispute on this order
    const existing = await Dispute.findOne({
      orderId,
      status: { $nin: ["resolved", "closed"] },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An open dispute already exists for this order" },
        { status: 409 },
      );
    }

    const dispute = await Dispute.create({
      orderId,
      customerId: order.customerId,
      manufacturerId: order.manufacturerId,
      initiatedBy: session.user.role,
      issueType,
      description,
      desiredResolution,
      customerEvidence: customerEvidence || [],
    });

    // Update order status to disputed
    order.status = "disputed";
    await order.save();

    // Notify counterpart
    if (session.user.role === "customer") {
      await notify.disputeOpened(
        order.manufacturerId,
        dispute._id,
        order.orderNumber,
      );
    } else {
      await notify.disputeOpened(
        order.customerId,
        dispute._id,
        order.orderNumber,
      );
    }

    return NextResponse.json({ dispute }, { status: 201 });
  } catch (error) {
    console.error("POST /api/disputes error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET /api/disputes  — list disputes for the current user
export async function GET(request) {
  try {
    const session = await resolveRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const query = {};
    if (session.user.role === "customer") {
      query.customerId = session.user.id;
    } else if (session.user.role === "manufacturer") {
      query.manufacturerId = session.user.id;
    } else if (session.user.role === "admin") {
      // admin sees all
    }
    if (status) query.status = status;

    const disputes = await Dispute.find(query)
      .populate("orderId", "orderNumber totalPrice")
      .populate("customerId", "name email")
      .populate("manufacturerId", "businessName email")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ disputes });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

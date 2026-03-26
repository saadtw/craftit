import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Dispute from "@/models/Dispute";
import Order from "@/models/Order";
import { notify } from "@/services/notificationService";

// POST /api/disputes  — customer opens a dispute
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "customer") {
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

    // Verify order belongs to this customer
    const order = await Order.findOne({
      _id: orderId,
      customerId: session.user.id,
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!["accepted", "in_production", "completed"].includes(order.status)) {
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
      customerId: session.user.id,
      manufacturerId: order.manufacturerId,
      issueType,
      description,
      desiredResolution,
      customerEvidence: customerEvidence || [],
    });

    // Update order status to disputed
    order.status = "disputed";
    await order.save();

    // Notify manufacturer
    await notify.disputeOpened(
      order.manufacturerId,
      dispute._id,
      order.orderNumber,
    );

    return NextResponse.json({ dispute }, { status: 201 });
  } catch (error) {
    console.error("POST /api/disputes error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET /api/disputes  — list disputes for the current user
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
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

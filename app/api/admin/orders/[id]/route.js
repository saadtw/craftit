import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import Dispute from "@/models/Dispute";
import "@/models/Product";
import "@/models/RFQ";
import "@/models/Bid";

// GET /api/admin/orders/[id] - get order details by ID, including dispute info if exists
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const [order, dispute] = await Promise.all([
      Order.findById(id)
        .populate("customerId", "name email phone location")
        .populate("manufacturerId", "businessName email businessPhone location")
        .populate("productId")
        .populate("rfqId")
        .populate("bidId")
        .lean(),
      Dispute.findOne({ orderId: id }).lean(),
    ]);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        hasDispute: !!dispute,
        disputeId: dispute?._id,
      },
      dispute,
    });
  } catch (error) {
    console.error("GET /api/admin/orders/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

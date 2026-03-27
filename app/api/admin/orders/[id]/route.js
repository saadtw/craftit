import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import Dispute from "@/models/Dispute";

// GET /api/admin/orders/[id]
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const [order, dispute] = await Promise.all([
      Order.findById(params.id)
        .populate("customerId", "name email phone location")
        .populate("manufacturerId", "businessName email businessPhone location")
        .populate("productId")
        .populate("rfqId")
        .populate("bidId")
        .lean(),
      Dispute.findOne({ orderId: params.id }).lean(),
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
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

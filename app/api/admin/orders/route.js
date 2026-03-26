import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import Dispute from "@/models/Dispute";

// GET /api/admin/orders
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const hasDispute = searchParams.get("hasDispute") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;
    if (search) query.orderNumber = { $regex: search, $options: "i" };

    // If filtering by dispute, get disputed order IDs first
    if (hasDispute) {
      const disputedOrderIds = await Dispute.distinct("orderId", {
        status: { $nin: ["resolved", "closed"] },
      });
      query._id = { $in: disputedOrderIds };
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("customerId", "name email")
        .populate("manufacturerId", "businessName email")
        .populate("productId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
    ]);

    return NextResponse.json({
      orders,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

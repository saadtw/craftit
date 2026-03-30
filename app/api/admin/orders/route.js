// app/api/admin/orders/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import Dispute from "@/models/Dispute";
import "@/models/Product";

// GET /api/admin/orders — list orders with filters
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const hasDispute = searchParams.get("hasDispute") === "true";
    const rawPage = Number.parseInt(searchParams.get("page") || "1", 10);
    const rawLimit = Number.parseInt(searchParams.get("limit") || "20", 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
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
        .populate({
          path: "customerId",
          select: "name email",
          skipInvalidIds: true,
        })
        .populate({
          path: "manufacturerId",
          select: "businessName email name",
          skipInvalidIds: true,
        })
        .populate({
          path: "productId",
          select: "name",
          skipInvalidIds: true,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      orders,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/admin/orders error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

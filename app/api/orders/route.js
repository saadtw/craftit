import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import "@/models/RFQ";
import "@/models/Bid";

// GET  /api/orders - List orders (role-aware)
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const orderType = searchParams.get("orderType");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    if (session.user.role === "customer") {
      query.customerId = session.user.id;
    } else if (session.user.role === "manufacturer") {
      query.manufacturerId = session.user.id;
    } else if (session.user.role === "admin") {
      // admin sees all — no extra filter
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (status) query.status = status;
    if (orderType) query.orderType = orderType;

    const orders = await Order.find(query)
      .populate("customerId", "name email")
      .populate("manufacturerId", "name businessName email")
      .populate("productId", "name images price")
      .populate("rfqId", "rfqNumber")
      .populate("bidId", "amount timeline")
      .populate("groupBuyId", "title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Order.countDocuments(query);

    // Compute summary stats for the caller
    const allOrders = await Order.find(query).lean();
    const stats = {
      total: allOrders.length,
      pending_acceptance: allOrders.filter(
        (o) => o.status === "pending_acceptance",
      ).length,
      accepted: allOrders.filter((o) => o.status === "accepted").length,
      in_production: allOrders.filter((o) => o.status === "in_production")
        .length,
      completed: allOrders.filter((o) => o.status === "completed").length,
      cancelled: allOrders.filter((o) => o.status === "cancelled").length,
      disputed: allOrders.filter((o) => o.status === "disputed").length,
      totalSpend: allOrders
        .filter((o) => o.status === "completed")
        .reduce((sum, o) => sum + (o.totalPrice || 0), 0),
    };

    return NextResponse.json({
      success: true,
      orders,
      stats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Orders GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

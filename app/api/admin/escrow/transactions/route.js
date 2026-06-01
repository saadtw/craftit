import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import EscrowTransaction from "@/models/EscrowTransaction";
import { resolveRequestSession } from "@/lib/requestAuth";

export async function GET(request) {
  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const manufacturerId = searchParams.get("manufacturerId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");
    const skip = (page - 1) * limit;

    const query = {};
    if (type) query.type = type;
    if (manufacturerId) query.manufacturerId = manufacturerId;

    const [transactions, total] = await Promise.all([
      EscrowTransaction.find(query)
        .populate("orderId", "orderNumber totalPrice")
        .populate("customerId", "name email")
        .populate("manufacturerId", "businessName name email")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EscrowTransaction.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      transactions,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin escrow transactions error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PaymentReleaseRequest from "@/models/PaymentReleaseRequest";
import { resolveRequestSession } from "@/lib/requestAuth";

export async function GET(request) {
  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const query = status
      ? { status }
      : {
          $or: [
            { status: "auto_approved", payoutMethod: { $in: ["manual", "none"] }, paidAt: { $exists: false } },
            { status: "approved", payoutMethod: "manual", paidAt: { $exists: false } },
          ],
        };

    const [releases, total] = await Promise.all([
      PaymentReleaseRequest.find(query)
        .populate("orderId", "orderNumber totalPrice paymentStatus")
        .populate("manufacturerId", "businessName name email stripeConnectAccountId")
        .populate("customerId", "name email")
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PaymentReleaseRequest.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      releases,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin escrow releases error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

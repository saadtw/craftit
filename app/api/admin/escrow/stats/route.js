import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import Dispute from "@/models/Dispute";
import PaymentReleaseRequest from "@/models/PaymentReleaseRequest";
import EscrowTransaction from "@/models/EscrowTransaction";
import { resolveRequestSession } from "@/lib/requestAuth";

export async function GET(request) {
  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [escrowAgg, releasedAgg, refundedAgg, pendingReleases, activeDisputes, disputedAgg] =
      await Promise.all([
        Order.aggregate([
          { $match: { paymentStatus: { $in: ["captured", "held_in_escrow", "release_requested"] } } },
          { $group: { _id: null, total: { $sum: "$totalPrice" } } },
        ]),
        EscrowTransaction.aggregate([
          { $match: { type: "released", createdAt: { $gte: startOfMonth } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        EscrowTransaction.aggregate([
          { $match: { type: "refunded", createdAt: { $gte: startOfMonth } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        PaymentReleaseRequest.countDocuments({
          status: { $in: ["pending", "auto_approved", "approved"] },
          payoutMethod: { $in: ["manual", "none"] },
          paidAt: { $exists: false },
        }),
        Dispute.countDocuments({
          status: { $in: ["open", "manufacturer_responded", "under_review"] },
        }),
        Order.aggregate([
          { $match: { status: "disputed" } },
          { $group: { _id: null, total: { $sum: "$totalPrice" } } },
        ]),
      ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalInEscrow: escrowAgg[0]?.total || 0,
        pendingReleases,
        releasedThisMonth: releasedAgg[0]?.total || 0,
        refundedThisMonth: refundedAgg[0]?.total || 0,
        activeDisputes,
        disputedAmount: disputedAgg[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("Admin escrow stats error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

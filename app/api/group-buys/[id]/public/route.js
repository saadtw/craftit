import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import GroupBuy from "@/models/GroupBuy";
import { resolveRequestSession } from "@/lib/requestAuth";

// GET /api/group-buys/[id]/public — no auth required
// If authenticated customer, also returns whether they've already joined
export async function GET(request, context) {
  const { id } = await context.params;

  try {
    await connectDB();

    // Optional auth — used to check if customer already joined
    const session = await resolveRequestSession(request);

    // Auto-sync status
    const now = new Date();
    await GroupBuy.updateMany(
      { _id: id, status: "scheduled", startDate: { $lte: now } },
      { $set: { status: "active" } },
    );
    await GroupBuy.updateMany(
      {
        _id: id,
        status: { $in: ["active", "paused"] },
        endDate: { $lte: now },
      },
      { $set: { status: "completed", completedAt: now } },
    );

    const groupBuy = await GroupBuy.findById(id)
      .populate({
        path: "productId",
        select: "name images category price description specifications",
      })
      .populate({
        path: "manufacturerId",
        select: "businessName name verificationStatus",
      })
      .lean();

    if (!groupBuy) {
      return NextResponse.json(
        { error: "Group buy not found" },
        { status: 404 },
      );
    }

    // Check if the requesting customer has already joined
    let hasJoined = false;
    let myParticipation = null;

    if (session?.user?.role === "customer") {
      const myEntry = groupBuy.participants?.find(
        (p) => p.customerId?.toString() === session.user.id,
      );
      if (myEntry) {
        hasJoined = true;
        myParticipation = {
          quantity: myEntry.quantity,
          unitPrice: myEntry.unitPrice,
          totalPrice: myEntry.totalPrice,
          joinedAt: myEntry.joinedAt,
          paymentStatus: myEntry.paymentStatus,
        };
      }
    }

    // Strip participant PII before returning
    const sanitized = {
      ...groupBuy,
      participants: undefined,
    };

    return NextResponse.json({
      success: true,
      groupBuy: sanitized,
      hasJoined,
      myParticipation,
    });
  } catch (error) {
    console.error("GroupBuy [id] public GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

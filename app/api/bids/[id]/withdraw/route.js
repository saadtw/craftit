import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { bidService } from "@/services/bidService";

// DELETE /api/bids/[id]/withdraw  — manufacturer withdraws a bid
export async function DELETE(request, context) {
  const params = await context.params;
  const id = params.id;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const bid = await bidService.withdrawBid(id, session.user.id);

    return NextResponse.json({
      success: true,
      message: "Bid withdrawn successfully",
      bid,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 400 },
    );
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { bidComparisonService } from "@/services/bidComparisonService";

// GET  /api/rfqs/[id]/bids - List bids for an RFQ with optional status filter
export async function GET(request, context) {
  const params = await context.params;
  const id = params.id;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const result = await bidComparisonService.compareRFQBids(id);

    return NextResponse.json({
      success: true,
      ...result,
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

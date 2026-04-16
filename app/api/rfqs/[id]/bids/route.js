import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import RFQ from "@/models/RFQ";
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

    const rfq = await RFQ.findById(id).select("customerId").lean();
    if (!rfq) {
      return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    }

    if (rfq.customerId?.toString() !== session.user.id.toString()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await bidComparisonService.compareRFQBids(id);

    const bids = (result.bids || []).map((bid) => {
      const ranking = bid?.ranking || {};
      return {
        ...bid,
        ranking: {
          overallScore: ranking.overallScore || 0,
        },
      };
    });

    return NextResponse.json({
      success: true,
      bids,
      analysis: result.analysis,
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

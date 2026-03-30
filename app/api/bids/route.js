// app/api/bids/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { bidService } from "@/services/bidService";

// POST /api/bids — place a new bid on a request
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.verificationStatus === "unverified") {
      return NextResponse.json(
        {
          error:
            "Only verified manufacturers can place bids. Submit a verification application in Settings.",
        },
        { status: 403 },
      );
    }

    await connectDB();
    const data = await request.json();

    const bid = await bidService.placeBid(session.user.id, data);

    return NextResponse.json(
      {
        success: true,
        bid,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 400 },
    );
  }
}

// GET /api/bids — get all bids for the logged-in manufacturer with optional status filter
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const bids = await bidService.getManufacturerBids(session.user.id, {
      status,
    });

    return NextResponse.json({
      success: true,
      bids,
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

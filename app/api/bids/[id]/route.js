import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { bidService } from "@/services/bidService";

export async function GET(request, context) {
  const params = await context.params;
  const id = params.id;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const bid = await bidService.getBidById(
      id,
      session.user.id,
      session.user.role,
    );

    return NextResponse.json({
      success: true,
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

export async function PUT(request, context) {
  const params = await context.params;
  const id = params.id;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const data = await request.json();

    const bid = await bidService.updateBid(id, session.user.id, data);

    return NextResponse.json({
      success: true,
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

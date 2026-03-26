import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Review from "@/models/Review";

// GET /api/reviews/order/[orderId]
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const review = await Review.findOne({ orderId: params.orderId })
      .populate("customerId", "name profilePicture")
      .lean();

    if (!review) {
      return NextResponse.json({ review: null });
    }

    return NextResponse.json({ review });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

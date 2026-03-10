import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import User from "@/models/User";

// POST - Customer submits review for a completed order
export async function POST(request, context) {
  const { id } = await context.params;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const {
      overallRating,
      qualityRating,
      communicationRating,
      deliveryRating,
      comment,
      photos,
      recommend,
    } = body;

    if (!overallRating || overallRating < 1 || overallRating > 5) {
      return NextResponse.json(
        { error: "Overall rating (1-5) is required" },
        { status: 400 },
      );
    }

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.customerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (order.status !== "completed") {
      return NextResponse.json(
        { error: "Reviews can only be submitted for completed orders" },
        { status: 400 },
      );
    }

    if (order.reviewed) {
      return NextResponse.json(
        { error: "You have already reviewed this order" },
        { status: 400 },
      );
    }

    // Mark order as reviewed
    order.reviewed = true;
    await order.save();

    // Update manufacturer's average rating and review count
    const manufacturer = await User.findById(order.manufacturerId);
    if (manufacturer) {
      const currentRating = manufacturer.stats?.averageRating || 0;
      const currentCount = manufacturer.stats?.totalReviews || 0;
      const newCount = currentCount + 1;
      const newAvg = (currentRating * currentCount + overallRating) / newCount;

      await User.findByIdAndUpdate(order.manufacturerId, {
        $set: { "stats.averageRating": Math.round(newAvg * 10) / 10 },
        $inc: { "stats.totalReviews": 1 },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Review submitted successfully. Thank you for your feedback!",
      review: {
        orderId: id,
        overallRating,
        qualityRating,
        communicationRating,
        deliveryRating,
        comment,
        photos: photos || [],
        recommend,
        submittedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Review submission error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

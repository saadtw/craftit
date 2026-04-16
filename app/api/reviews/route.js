// app/api/reviews/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Review from "@/models/Review";
import Order from "@/models/Order";
import User from "@/models/User";
import Product from "@/models/Product";
import { resolveRequestSession } from "@/lib/requestAuth";

// POST /api/reviews  — customer submits a review for a completed order
export async function POST(request) {
  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const {
      orderId,
      overallRating,
      qualityRating,
      communicationRating,
      deliveryRating,
      title,
      comment,
      photos,
      recommended,
    } = body;

    if (!orderId || !overallRating) {
      return NextResponse.json(
        { error: "orderId and overallRating are required" },
        { status: 400 },
      );
    }

    // Verify order belongs to this customer and is completed
    const order = await Order.findOne({
      _id: orderId,
      customerId: session.user.id,
      status: "completed",
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found or not yet completed" },
        { status: 404 },
      );
    }

    if (order.reviewed) {
      return NextResponse.json(
        { error: "You have already reviewed this order" },
        { status: 409 },
      );
    }

    const review = await Review.create({
      orderId,
      customerId: session.user.id,
      manufacturerId: order.manufacturerId,
      productId: order.productId,
      overallRating,
      qualityRating,
      communicationRating,
      deliveryRating,
      title,
      comment,
      photos: photos || [],
      recommended: recommended !== undefined ? recommended : true,
    });

    // Mark order as reviewed
    order.reviewed = true;
    order.reviewId = review._id;
    await order.save();

    // Update manufacturer's average rating
    const manufacturerReviews = await Review.find({
      manufacturerId: order.manufacturerId,
    });
    const avgRating =
      manufacturerReviews.reduce((sum, r) => sum + r.overallRating, 0) /
      manufacturerReviews.length;

    await User.findByIdAndUpdate(order.manufacturerId, {
      "stats.averageRating": Math.round(avgRating * 10) / 10,
      "stats.totalReviews": manufacturerReviews.length,
    });

    // Also update product rating if it was a product order
    if (order.productId) {
      const productReviews = await Review.find({
        productId: order.productId,
        overallRating: { $exists: true },
      });
      const productAvg =
        productReviews.reduce((s, r) => s + r.overallRating, 0) /
        productReviews.length;
      await Product.findByIdAndUpdate(order.productId, {
        averageRating: Math.round(productAvg * 10) / 10,
        totalReviews: productReviews.length,
      });
    }
    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Review already exists for this order" },
        { status: 409 },
      );
    }
    console.error("POST /api/reviews error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET /api/reviews?manufacturerId=xxx  — public reviews for a manufacturer
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const manufacturerId = searchParams.get("manufacturerId");
    const customerId = searchParams.get("customerId");

    if (!manufacturerId && !customerId) {
      return NextResponse.json(
        { error: "Query param required" },
        { status: 400 },
      );
    }

    const query = {};
    if (manufacturerId) query.manufacturerId = manufacturerId;
    if (customerId) query.customerId = customerId;

    const reviews = await Review.find(query)
      .populate("customerId", "name profilePicture")
      .populate("orderId", "orderNumber orderType")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ reviews });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

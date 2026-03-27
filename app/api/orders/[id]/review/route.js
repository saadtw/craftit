import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Review from "@/models/Review";
import Order from "@/models/Order";
import User from "@/models/User";
import Product from "@/models/Product";

/**
 * POST /api/orders/[id]/review
 *
 * Thin wrapper so the customer order detail page can POST to the
 * order-scoped URL. Internally does exactly what /api/reviews does.
 *
 * Body: {
 *   overallRating: number (1-5, required),
 *   qualityRating?: number,
 *   communicationRating?: number,
 *   deliveryRating?: number,
 *   comment?: string,
 *   recommend?: boolean,   (note: field is "recommend" from form, stored as "recommended")
 * }
 */
export async function POST(request, context) {
  const { id: orderId } = await context.params;

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
      recommend, // form field name
      recommended, // also accept direct field name
      title,
      photos,
    } = body;

    if (!overallRating || overallRating < 1 || overallRating > 5) {
      return NextResponse.json(
        { error: "overallRating must be between 1 and 5" },
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
      qualityRating: qualityRating || undefined,
      communicationRating: communicationRating || undefined,
      deliveryRating: deliveryRating || undefined,
      title: title || undefined,
      comment: comment || undefined,
      photos: photos || [],
      recommended:
        recommend !== undefined
          ? recommend
          : recommended !== undefined
            ? recommended
            : true,
    });

    // Mark order as reviewed
    order.reviewed = true;
    order.reviewId = review._id;
    await order.save();

    // Update manufacturer's average rating
    const allManufacturerReviews = await Review.find({
      manufacturerId: order.manufacturerId,
    });
    const avgRating =
      allManufacturerReviews.reduce((sum, r) => sum + r.overallRating, 0) /
      allManufacturerReviews.length;

    await User.findByIdAndUpdate(order.manufacturerId, {
      "stats.averageRating": Math.round(avgRating * 10) / 10,
      "stats.totalReviews": allManufacturerReviews.length,
    });

    // Update product rating if this was a product order
    if (order.productId) {
      const productReviews = await Review.find({ productId: order.productId });
      const productAvg =
        productReviews.reduce((s, r) => s + r.overallRating, 0) /
        productReviews.length;
      await Product.findByIdAndUpdate(order.productId, {
        averageRating: Math.round(productAvg * 10) / 10,
        totalReviews: productReviews.length,
      });
    }

    return NextResponse.json({ success: true, review }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Review already exists for this order" },
        { status: 409 },
      );
    }
    console.error("POST /api/orders/[id]/review error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/orders/[id]/review — fetch existing review for this order
export async function GET(request, context) {
  const { id: orderId } = await context.params;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const review = await Review.findOne({ orderId })
      .populate("customerId", "name profilePicture")
      .lean();

    return NextResponse.json({ success: true, review: review || null });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

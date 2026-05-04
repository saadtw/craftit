import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import "@/models/User";
import "@/models/RFQ";
import "@/models/CustomOrder";
import "@/models/Bid";
import "@/models/Product";
import "@/models/GroupBuy";
import PaymentReleaseRequest from "@/models/PaymentReleaseRequest";
import PaymentSchedule from "@/models/PaymentSchedule";
import Review from "@/models/Review";
import { resolveRequestSession } from "@/lib/requestAuth";

// GET /api/orders/[id] - Get single order detail
export async function GET(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const order = await Order.findById(id)
      .populate("customerId", "name email phone")
      .populate("manufacturerId", "name businessName email phone")
      .populate("productId", "name images price description model3D")
      .populate({
        path: "rfqId",
        select: "rfqNumber endDate customOrderId",
        populate: {
          path: "customOrderId",
          select: "title model3D images",
        },
      })
      .populate(
        "bidId",
        "amount timeline proposedMilestones costBreakdown materialsDescription processDescription",
      )
      .populate("groupBuyId", "title currentTierIndex currentDiscountedPrice")
      .lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Access control — customer sees their own orders, manufacturer sees their own
    const isCustomer =
      session.user.role === "customer" &&
      order.customerId._id.toString() === session.user.id;
    const isManufacturer =
      session.user.role === "manufacturer" &&
      order.manufacturerId._id.toString() === session.user.id;
    const isAdmin = session.user.role === "admin";

    if (!isCustomer && !isManufacturer && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check for a review
    const review = await Review.findOne({ orderId: id });
    if (review) {
      order.reviewed = true;
    }

    // Fetch Payment Releases
    const paymentReleases = await PaymentReleaseRequest.find({ orderId: id }).sort({ createdAt: -1 }).lean();
    // Fetch Payment Schedule
    const paymentSchedule = await PaymentSchedule.findOne({ orderId: id }).lean();

    return NextResponse.json({ 
      success: true, 
      order,
      paymentReleases,
      paymentSchedule,
    });
  } catch (error) {
    console.error("Order GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

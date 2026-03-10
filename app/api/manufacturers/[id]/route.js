import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Product from "@/models/Product";
import Order from "@/models/Order";

// GET /api/manufacturers/[id]
// Public manufacturer profile — no auth required.
// Returns business info, active products, and computed stats.

export async function GET(request, context) {
  const { id } = await context.params;

  try {
    await connectDB();

    // Load manufacturer — only expose public-safe fields
    const manufacturer = await User.findOne({
      _id: id,
      role: "manufacturer",
      isActive: true,
    })
      .select(
        "name businessName businessDescription businessLogo businessBanner " +
          "businessAddress location verificationStatus certifications " +
          "manufacturingCapabilities materialsAvailable minOrderQuantity " +
          "budgetRange stats createdAt",
      )
      .lean();

    if (!manufacturer) {
      return NextResponse.json(
        { error: "Manufacturer not found" },
        { status: 404 },
      );
    }

    // Active products by this manufacturer
    const products = await Product.find({
      manufacturerId: id,
      status: "active",
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Completed order count (public trust signal)
    const completedOrderCount = await Order.countDocuments({
      manufacturerId: id,
      status: "completed",
    });

    return NextResponse.json({
      success: true,
      manufacturer: {
        ...manufacturer,
        completedOrders: completedOrderCount,
      },
      products,
    });
  } catch (error) {
    console.error("Manufacturer profile GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

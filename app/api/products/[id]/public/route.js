import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import User from "@/models/User";

// GET /api/products/[id]/public
// Returns a single active product with manufacturer info.
// No auth required — used by customer product detail and order pages.

export async function GET(request, context) {
  const { id } = await context.params;

  try {
    await connectDB();

    const product = await Product.findOne({ _id: id, status: "active" })
      .populate(
        "manufacturerId",
        "name businessName businessLogo verificationStatus location stats manufacturingCapabilities",
      )
      .lean();

    if (!product) {
      return NextResponse.json(
        { error: "Product not found or unavailable" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Public product GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

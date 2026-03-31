import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";

// GET /api/products/recently-viewed?ids=id1,id2,id3
// Resolves product cards in the same order as provided ids.
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids") || "";

    const ids = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (!ids.length) {
      return NextResponse.json({ success: true, products: [] });
    }

    const products = await Product.find({
      _id: { $in: ids },
      status: "active",
    })
      .select(
        "name price category subCategory images averageRating totalReviews moq stock manufacturerId",
      )
      .populate(
        "manufacturerId",
        "name businessName businessLogo verificationStatus",
      )
      .lean();

    const byId = new Map(
      products.map((product) => [product._id.toString(), product]),
    );
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

    return NextResponse.json({ success: true, products: ordered });
  } catch (error) {
    console.error("Recently viewed products GET error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Unable to fetch recently viewed products",
      },
      { status: 500 },
    );
  }
}

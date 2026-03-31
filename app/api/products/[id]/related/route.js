import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";

// GET /api/products/[id]/related
// Finds related active products based on category/subcategory/tags.
export async function GET(request, context) {
  try {
    await connectDB();

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 6, 12);

    const source = await Product.findOne({ _id: id, status: "active" })
      .select("_id category subCategory tags")
      .lean();

    if (!source) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 },
      );
    }

    const candidates = await Product.find({
      _id: { $ne: source._id },
      status: "active",
      $or: [
        { category: source.category },
        source.subCategory ? { subCategory: source.subCategory } : null,
        source.tags?.length ? { tags: { $in: source.tags } } : null,
      ].filter(Boolean),
    })
      .select(
        "name price category subCategory images averageRating totalReviews moq stock manufacturerId",
      )
      .populate(
        "manufacturerId",
        "name businessName businessLogo verificationStatus",
      )
      .limit(40)
      .lean();

    const scored = candidates
      .map((p) => {
        let score = 0;
        if (p.category === source.category) score += 4;
        if (source.subCategory && p.subCategory === source.subCategory)
          score += 3;
        if (source.tags?.length && p.tags?.length) {
          const overlap = p.tags.filter((tag) =>
            source.tags.includes(tag),
          ).length;
          score += overlap * 2;
        }
        return { ...p, _score: score };
      })
      .sort((a, b) => {
        if (b._score !== a._score) return b._score - a._score;
        return (b.averageRating || 0) - (a.averageRating || 0);
      })
      .slice(0, limit)
      .map(({ _score, ...rest }) => rest);

    return NextResponse.json({ success: true, products: scored });
  } catch (error) {
    console.error("Related products GET error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Unable to fetch related products",
      },
      { status: 500 },
    );
  }
}

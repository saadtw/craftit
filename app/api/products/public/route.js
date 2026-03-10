import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import User from "@/models/User";

// GET /api/products/public
// Public catalog — all active products from verified manufacturers.
// No auth required for browsing; session used for wishlist status if logged in.

export async function GET(request) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const material = searchParams.get("material") || "";
    const minPrice = parseFloat(searchParams.get("minPrice")) || 0;
    const maxPrice = parseFloat(searchParams.get("maxPrice")) || Infinity;
    const minMoq = parseInt(searchParams.get("minMoq")) || 0;
    const maxMoq = parseInt(searchParams.get("maxMoq")) || Infinity;
    const manufacturerId = searchParams.get("manufacturerId") || "";
    const sort = searchParams.get("sort") || "newest";
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 12;
    const skip = (page - 1) * limit;

    // Base query — only show active products
    const query = { status: "active" };

    if (category) query.category = category;
    if (manufacturerId) query.manufacturerId = manufacturerId;
    if (material)
      query["specifications.material"] = { $regex: material, $options: "i" };

    if (minPrice > 0 || maxPrice !== Infinity) {
      query.price = {};
      if (minPrice > 0) query.price.$gte = minPrice;
      if (maxPrice !== Infinity) query.price.$lte = maxPrice;
    }

    if (minMoq > 0 || maxMoq !== Infinity) {
      query.moq = {};
      if (minMoq > 0) query.moq.$gte = minMoq;
      if (maxMoq !== Infinity) query.moq.$lte = maxMoq;
    }

    if (search) {
      query.$text = { $search: search };
    }

    let sortObj = {};
    switch (sort) {
      case "newest":
        sortObj = { createdAt: -1 };
        break;
      case "price_asc":
        sortObj = { price: 1 };
        break;
      case "price_desc":
        sortObj = { price: -1 };
        break;
      case "popular":
        sortObj = { views: -1 };
        break;
      case "top_rated":
        sortObj = { averageRating: -1 };
        break;
      case "most_ordered":
        sortObj = { totalOrders: -1 };
        break;
      default:
        sortObj = { createdAt: -1 };
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate(
          "manufacturerId",
          "name businessName businessLogo verificationStatus location stats",
        )
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    // Attach wishlist flag if customer is logged in
    let wishlistIds = new Set();
    if (session?.user?.role === "customer") {
      const user = await User.findById(session.user.id)
        .select("wishlist")
        .lean();
      if (user?.wishlist) {
        user.wishlist.forEach((w) => {
          if (w.itemType === "product") wishlistIds.add(w.itemId.toString());
        });
      }
    }

    const enriched = products.map((p) => ({
      ...p,
      isWishlisted: wishlistIds.has(p._id.toString()),
    }));

    // Aggregate available categories and price range for filter UI
    const [categories, priceRange] = await Promise.all([
      Product.distinct("category", { status: "active" }),
      Product.aggregate([
        { $match: { status: "active" } },
        {
          $group: {
            _id: null,
            min: { $min: "$price" },
            max: { $max: "$price" },
          },
        },
      ]),
    ]);

    return NextResponse.json({
      success: true,
      products: enriched,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      meta: {
        categories,
        priceRange: priceRange[0] || { min: 0, max: 10000 },
      },
    });
  } catch (error) {
    console.error("Public products GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

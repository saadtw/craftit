import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import User from "@/models/User";
import { resolveRequestSession } from "@/lib/requestAuth";

// GET /api/products/public
// Public catalog — all active products from verified manufacturers.
// No auth required for browsing; session used for wishlist status if logged in.

export async function GET(request) {
  try {
    await connectDB();

    const session = await resolveRequestSession(request);

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

    let products, total;

    if (search) {
      const trimmedSearch = search.trim();
      const searchLower = trimmedSearch.toLowerCase();
      const escapedSearch = trimmedSearch.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );
      const searchRegex = new RegExp(escapedSearch, "i");

      const buildPipeline = (matchQuery) => [
        { $match: matchQuery },
        {
          $addFields: {
            relevanceScore: {
              $add: [
                {
                  $cond: [{ $eq: [{ $toLower: "$name" }, searchLower] }, 8, 0],
                },
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: "$name",
                        regex: escapedSearch,
                        options: "i",
                      },
                    },
                    5,
                    0,
                  ],
                },
                {
                  $cond: [
                    {
                      $gt: [
                        {
                          $size: {
                            $filter: {
                              input: { $ifNull: ["$tags", []] },
                              as: "t",
                              cond: {
                                $regexMatch: {
                                  input: "$t",
                                  regex: escapedSearch,
                                  options: "i",
                                },
                              },
                            },
                          },
                        },
                        0,
                      ],
                    },
                    3,
                    0,
                  ],
                },
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: { $ifNull: ["$description", ""] },
                        regex: escapedSearch,
                        options: "i",
                      },
                    },
                    2,
                    0,
                  ],
                },
              ],
            },
          },
        },
      ];

      let aggSortObj = {};
      switch (sort) {
        case "newest":
          aggSortObj = { relevanceScore: -1, createdAt: -1 };
          break;
        case "price_asc":
          aggSortObj = { relevanceScore: -1, price: 1 };
          break;
        case "price_desc":
          aggSortObj = { relevanceScore: -1, price: -1 };
          break;
        case "popular":
          aggSortObj = { relevanceScore: -1, views: -1 };
          break;
        case "top_rated":
          aggSortObj = { relevanceScore: -1, averageRating: -1 };
          break;
        case "most_ordered":
          aggSortObj = { relevanceScore: -1, totalOrders: -1 };
          break;
        case "relevance":
        default:
          aggSortObj = { relevanceScore: -1 };
      }

      const runAggregation = async (pipeline) => {
        const [aggProducts, totalResults] = await Promise.all([
          Product.aggregate([
            ...pipeline,
            { $sort: aggSortObj },
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "users",
                localField: "manufacturerId",
                foreignField: "_id",
                as: "manufacturerId",
              },
            },
            {
              $unwind: {
                path: "$manufacturerId",
                preserveNullAndEmptyArrays: true,
              },
            },
          ]),
          Product.aggregate([...pipeline, { $count: "total" }]),
        ]);

        const mapped = aggProducts.map((p) => {
          if (p.manufacturerId) {
            p.manufacturerId = {
              _id: p.manufacturerId._id,
              name: p.manufacturerId.name,
              businessName: p.manufacturerId.businessName,
              businessLogo: p.manufacturerId.businessLogo,
              verificationStatus: p.manufacturerId.verificationStatus,
              location: p.manufacturerId.location,
              stats: p.manufacturerId.stats,
            };
          }
          return p;
        });

        return {
          products: mapped,
          total: totalResults[0] ? totalResults[0].total : 0,
        };
      };

      const baseRegexQuery = {
        ...query,
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { tags: searchRegex },
        ],
      };

      const regexPipeline = buildPipeline(baseRegexQuery);
      const result = await runAggregation(regexPipeline);
      products = result.products;
      total = result.total;
    } else {
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

      const results = await Promise.all([
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
      products = results[0];
      total = results[1];
    }

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

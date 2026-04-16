import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import User from "@/models/User";
import { resolveRequestSession } from "@/lib/requestAuth";

function topEntries(weightMap, limit = 6) {
  return [...weightMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

function addWeight(weightMap, key, amount) {
  if (!key) return;
  weightMap.set(key, (weightMap.get(key) || 0) + amount);
}

// GET /api/products/suggested?limit=6&recentIds=id1,id2,id3
// Personalized suggestions using recent activity + wishlist interests.
export async function GET(request) {
  try {
    await connectDB();

    const session = await resolveRequestSession(request);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 6, 12);

    const recentIds = (searchParams.get("recentIds") || "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    const categoryWeights = new Map();
    const subCategoryWeights = new Map();
    const tagWeights = new Map();

    const recentProducts = recentIds.length
      ? await Product.find({ _id: { $in: recentIds }, status: "active" })
          .select("category subCategory tags")
          .lean()
      : [];

    for (const p of recentProducts) {
      addWeight(categoryWeights, p.category, 3);
      addWeight(subCategoryWeights, p.subCategory, 2);
      for (const tag of p.tags || []) addWeight(tagWeights, tag, 1);
    }

    const excludedIdSet = new Set(recentIds);

    if (session?.user?.role === "customer") {
      const user = await User.findById(session.user.id)
        .select("wishlist")
        .lean();
      const wishlistProductIds = (user?.wishlist || [])
        .filter(
          (entry) =>
            entry.itemType === "product" &&
            entry.itemId &&
            mongoose.Types.ObjectId.isValid(entry.itemId.toString()),
        )
        .map((entry) => entry.itemId.toString())
        .slice(0, 25);

      const wishlistProducts = wishlistProductIds.length
        ? await Product.find({
            _id: { $in: wishlistProductIds },
            status: "active",
          })
            .select("category subCategory tags")
            .lean()
        : [];

      for (const p of wishlistProducts) {
        addWeight(categoryWeights, p.category, 2);
        addWeight(subCategoryWeights, p.subCategory, 1.5);
        for (const tag of p.tags || []) addWeight(tagWeights, tag, 0.75);
      }

      for (const pId of wishlistProductIds) excludedIdSet.add(pId);
    }

    const topCategories = topEntries(categoryWeights, 5);
    const topSubCategories = topEntries(subCategoryWeights, 5);
    const topTags = topEntries(tagWeights, 8);

    const projection =
      "name description price category subCategory tags images averageRating totalReviews totalOrders views manufacturerId";

    let candidates = [];

    const hasSignals =
      topCategories.length || topSubCategories.length || topTags.length;

    if (hasSignals) {
      const discoveryQuery = {
        status: "active",
        _id: { $nin: [...excludedIdSet] },
        $or: [
          topCategories.length ? { category: { $in: topCategories } } : null,
          topSubCategories.length
            ? { subCategory: { $in: topSubCategories } }
            : null,
          topTags.length ? { tags: { $in: topTags } } : null,
        ].filter(Boolean),
      };

      candidates = await Product.find(discoveryQuery)
        .select(projection)
        .populate(
          "manufacturerId",
          "name businessName businessLogo verificationStatus",
        )
        .limit(60)
        .lean();
    }

    if (!candidates.length) {
      // Fallback to strong marketplace performers when user signals are sparse.
      const fallback = await Product.find({
        status: "active",
        _id: { $nin: [...excludedIdSet] },
      })
        .select(projection)
        .populate(
          "manufacturerId",
          "name businessName businessLogo verificationStatus",
        )
        .sort({ averageRating: -1, totalOrders: -1, views: -1, createdAt: -1 })
        .limit(limit)
        .lean();

      return NextResponse.json({
        success: true,
        products: fallback,
        isPersonalized: false,
      });
    }

    const scored = candidates
      .map((p) => {
        const categoryScore = (categoryWeights.get(p.category) || 0) * 3;
        const subCategoryScore =
          (subCategoryWeights.get(p.subCategory) || 0) * 2;
        const tagScore = (p.tags || []).reduce(
          (sum, tag) => sum + (tagWeights.get(tag) || 0),
          0,
        );

        const popularityScore =
          (p.averageRating || 0) +
          Math.min((p.totalOrders || 0) / 20, 3) +
          Math.min((p.views || 0) / 200, 2);

        return {
          ...p,
          _score: categoryScore + subCategoryScore + tagScore + popularityScore,
        };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, limit)
      .map(({ _score, ...rest }) => rest);

    return NextResponse.json({
      success: true,
      products: scored,
      isPersonalized: true,
    });
  } catch (error) {
    console.error("Suggested products GET error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Unable to fetch suggested products",
      },
      { status: 500 },
    );
  }
}

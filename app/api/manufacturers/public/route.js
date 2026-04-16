import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

// GET /api/manufacturers/public
// No auth required — public listing of verified/unverified manufacturers
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const country = searchParams.get("country") || "";
    const capability = searchParams.get("capability") || "";
    const material = searchParams.get("material") || "";
    const verifiedOnly = searchParams.get("verifiedOnly") === "true";
    const sort = searchParams.get("sort") || "rating";
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 12;
    const skip = (page - 1) * limit;

    const query = {
      role: "manufacturer",
      isActive: true,
      verificationStatus: { $in: ["verified", "unverified"] }, // exclude suspended
    };

    if (verifiedOnly) {
      query.verificationStatus = "verified";
    }

    if (country) query["businessAddress.country"] = country;
    if (capability) query.manufacturingCapabilities = capability;
    if (material) query.materialsAvailable = material;

    if (search) {
      // Escape regex special characters to prevent ReDoS
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { businessName: { $regex: escapedSearch, $options: "i" } },
        { businessDescription: { $regex: escapedSearch, $options: "i" } },
        { name: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    let sortObj = {};
    switch (sort) {
      case "rating":
        sortObj = { "stats.averageRating": -1 };
        break;
      case "orders":
        sortObj = { "stats.completedOrders": -1 };
        break;
      case "newest":
        sortObj = { createdAt: -1 };
        break;
      default:
        sortObj = { "stats.averageRating": -1 };
    }

    const manufacturers = await User.find(query)
      .select(
        "businessName name businessLogo businessBanner businessDescription businessAddress manufacturingCapabilities materialsAvailable verificationStatus stats minOrderQuantity createdAt",
      )
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await User.countDocuments(query);

    return NextResponse.json({
      success: true,
      manufacturers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Manufacturers public GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

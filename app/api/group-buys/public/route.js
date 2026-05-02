import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import GroupBuy from "@/models/GroupBuy";

// GET /api/group-buys/public — no auth required, active group buys only
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "newest";
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 12;
    const skip = (page - 1) * limit;

    // Auto-sync statuses before querying
    const now = new Date();
    await GroupBuy.updateMany(
      { status: "scheduled", startDate: { $lte: now } },
      { $set: { status: "active" } },
    );
    await GroupBuy.updateMany(
      { status: { $in: ["active", "paused"] }, endDate: { $lte: now } },
      { $set: { status: "completed", completedAt: now } },
    );

    let query = {
      status: "active",
      endDate: { $gte: now },
    };

    let sortObj = {};
    switch (sort) {
      case "ending_soon":
        sortObj = { endDate: 1 };
        break;
      case "participants":
        sortObj = { currentParticipantCount: -1 };
        break;
      case "discount":
        sortObj = { "tiers.0.discountPercent": -1 };
        break;
      case "newest":
      default:
        sortObj = { createdAt: -1 };
    }

    let groupBuys = await GroupBuy.find(query)
      .populate({
        path: "productId",
        select: "name images category price model3D",
      })
      .populate({
        path: "manufacturerId",
       select: "businessName name businessLogo",
      })
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();

    // Filter by category after populate
    if (category) {
      groupBuys = groupBuys.filter((g) => g.productId?.category === category);
    }

    // Filter by search term
    if (search) {
      const q = search.toLowerCase();
      groupBuys = groupBuys.filter(
        (g) =>
          g.title?.toLowerCase().includes(q) ||
          g.productId?.name?.toLowerCase().includes(q),
      );
    }

    // Anonymize participant data for public view
    groupBuys = groupBuys.map((g) => ({
      ...g,
      participants: undefined, // strip entirely — use counts only
    }));

    const total = await GroupBuy.countDocuments(query);

    return NextResponse.json({
      success: true,
      groupBuys,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GroupBuy public GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

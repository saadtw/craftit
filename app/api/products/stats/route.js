// app/api/products/stats/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";

// GET  /api/products/stats - Catalog-level stats for the manufacturer
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const manufacturerObjId = new mongoose.Types.ObjectId(session.user.id);

    const [statusCounts, aggregateStats] = await Promise.all([
      Product.aggregate([
        { $match: { manufacturerId: manufacturerObjId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Product.aggregate([
        {
          $match: {
            manufacturerId: manufacturerObjId,
            status: { $ne: "archived" },
          },
        },
        {
          $group: {
            _id: null,
            totalViews: { $sum: "$views" },
            totalOrders: { $sum: "$totalOrders" },
            avgRating: { $avg: "$averageRating" },
          },
        },
      ]),
    ]);

    // Build status map
    const counts = { active: 0, draft: 0, out_of_stock: 0, archived: 0 };
    statusCounts.forEach(({ _id, count }) => {
      if (_id) counts[_id] = count;
    });

    const stats = aggregateStats[0] || {
      totalViews: 0,
      totalOrders: 0,
      avgRating: 0,
    };

    return NextResponse.json({
      success: true,
      stats: {
        total: counts.active + counts.draft + counts.out_of_stock,
        active: counts.active,
        draft: counts.draft,
        out_of_stock: counts.out_of_stock,
        archived: counts.archived,
        totalViews: stats.totalViews,
        totalOrders: stats.totalOrders,
        avgRating: Math.round((stats.avgRating || 0) * 10) / 10,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

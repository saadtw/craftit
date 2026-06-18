import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import GroupBuy from "@/models/GroupBuy";
import Product from "@/models/Product";
import User from "@/models/User";
import { resolveRequestSession } from "@/lib/requestAuth";
import mongoose from "mongoose";

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
    const joined = searchParams.get("joined") === "true";

    // Resolve session only when the joined filter is requested
    const session = joined ? await resolveRequestSession(request) : null;

    // Auto-sync statuses before querying
    const now = new Date();
    await GroupBuy.updateMany(
      { status: "scheduled", startDate: { $lte: now } },
      { $set: { status: "active" } }
    );
    await GroupBuy.updateMany(
      { status: { $in: ["active", "paused"] }, endDate: { $lte: now } },
      { $set: { status: "payment_processing" } }
    );

    let query = {
      status: "active",
      endDate: { $gte: now },
    };

    // When joined=true, restrict to group buys where this customer is a participant
    if (joined && session?.user?.id) {
      query["participants.customerId"] = new mongoose.Types.ObjectId(
        session.user.id
      );
    }

    let sortObj = {};
    switch (sort) {
      case "ending_soon":
        sortObj = { endDate: 1 };
        break;
      case "participants":
        sortObj = { currentParticipantCount: -1 };
        break;
      case "discount":
        sortObj = { maxDiscount: -1 };
        break;
      case "newest":
      default:
        sortObj = { createdAt: -1 };
    }

    const pipeline = [];

    // Match GroupBuy status
    pipeline.push({ $match: query });

    // Lookup Product
    pipeline.push({
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "productData"
      }
    });

    // Unwind Product
    pipeline.push({
      $unwind: {
        path: "$productData",
        preserveNullAndEmptyArrays: false // Only group buys with valid products
      }
    });

    // Filter by Category
    if (category) {
      pipeline.push({
        $match: {
          "productData.category": category
        }
      });
    }

    // Filter by Search (Title or Product Name)
    if (search) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escapedSearch, "i");
      pipeline.push({
        $match: {
          $or: [
            { title: searchRegex },
            { "productData.name": searchRegex }
          ]
        }
      });
    }

    // Lookup Manufacturer
    pipeline.push({
      $lookup: {
        from: "users",
        localField: "manufacturerId",
        foreignField: "_id",
        as: "manufacturerData"
      }
    });

    pipeline.push({
      $unwind: {
        path: "$manufacturerData",
        preserveNullAndEmptyArrays: true
      }
    });

    // Add max discount for sorting
    pipeline.push({
      $addFields: {
        maxDiscount: {
          $arrayElemAt: ["$tiers.discountPercent", 0]
        }
      }
    });

    // Sort
    pipeline.push({ $sort: sortObj });

    // Facet for pagination and counting
    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              title: 1,
              description: 1,
              basePrice: 1,
              tiers: 1,
              minParticipants: 1,
              minimumViableQuantity: 1,
              maxParticipants: 1,
              startDate: 1,
              endDate: 1,
              termsAndConditions: 1,
              joinHoldPercent: 1,
              status: 1,
              currentQuantity: 1,
              currentParticipantCount: 1,
              currentTierIndex: 1,
              currentDiscountedPrice: 1,
              createdAt: 1,
              updatedAt: 1,
              "productId._id": "$productData._id",
              "productId.name": "$productData.name",
              "productId.images": "$productData.images",
              "productId.category": "$productData.category",
              "productId.price": "$productData.price",
              "productId.model3D": "$productData.model3D",
              "manufacturerId._id": "$manufacturerData._id",
              "manufacturerId.businessName": "$manufacturerData.businessName",
              "manufacturerId.name": "$manufacturerData.name",
              "manufacturerId.businessLogo": "$manufacturerData.businessLogo"
            }
          }
        ]
      }
    });

    const [aggregationResult] = await GroupBuy.aggregate(pipeline);

    const total = aggregationResult.metadata[0]?.total || 0;
    const groupBuys = aggregationResult.data;

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

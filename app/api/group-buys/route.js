import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import GroupBuy from "@/models/GroupBuy";
import Product from "@/models/Product";
import Order from "@/models/Order";
import { resolveRequestSession } from "@/lib/requestAuth";
import { notify } from "@/services/notificationService";

// GET  /api/group-buys - List group buys
// Manufacturer sees their own; public/customer sees active ones
export async function GET(request) {
  try {
    const session = await resolveRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "newest";
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 12;
    const skip = (page - 1) * limit;

    let query = {};

    if (session.user.role === "manufacturer") {
      query.manufacturerId = session.user.id;
      if (status) query.status = status;
    } else {
      // customers/public only see active
      query.status = "active";
      query.endDate = { $gte: new Date() };
      if (searchParams.get("joined") === "true" && session?.user?.id) {
        query["participants.customerId"] = session.user.id;
      }
    }

    // Auto-sync status for scheduled -> active
    const now = new Date();
    await GroupBuy.updateMany(
      { status: "scheduled", startDate: { $lte: now } },
      { $set: { status: "active" } },
    );
    
    // Auto-complete ended campaigns
    const endedCampaigns = await GroupBuy.find({
      status: { $in: ["active", "paused"] },
      endDate: { $lte: now },
    });

    for (const groupBuy of endedCampaigns) {
      groupBuy.status = "completed";
      groupBuy.completedAt = now;

      const productName = groupBuy.title || "Group Buy";
      for (let i = 0; i < groupBuy.participants.length; i++) {
        const participant = groupBuy.participants[i];
        
        // Create order
        const order = await Order.create({
          orderType: "group_buy",
          groupBuyId: groupBuy._id,
          productId: groupBuy.productId,
          customerId: participant.customerId,
          manufacturerId: groupBuy.manufacturerId,
          quantity: participant.quantity,
          unitPrice: participant.unitPrice,
          totalPrice: participant.totalPrice,
          status: participant.remainingBalance > 0 ? "awaiting_production_ack" : "accepted",
          paymentStatus: participant.remainingBalance > 0 ? "authorized" : "captured",
        });

        // Save orderId to participant
        groupBuy.participants[i].orderId = order._id;

        // Notify
        notify.groupBuyCompleted(
          participant.customerId,
          groupBuy._id,
          productName,
        );
      }
      await groupBuy.save();
    }

    let sortObj = {};
    switch (sort) {
      case "ending_soon":
        sortObj = { endDate: 1 };
        break;
      case "newest":
        sortObj = { createdAt: -1 };
        break;
      case "participants":
        sortObj = { currentParticipantCount: -1 };
        break;
      case "discount":
        sortObj = { "tiers.0.discountPercent": -1 };
        break;
      default:
        sortObj = { createdAt: -1 };
    }

    let groupBuys = await GroupBuy.find(query)
      .populate({
        path: "productId",
        select: "name images category price model3D",
        ...(category ? { match: { category } } : {}),
      })
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();

    // Filter out nulls from category match
    if (category) {
      groupBuys = groupBuys.filter((g) => g.productId !== null);
    }

    // Apply search on product name
    if (search) {
      groupBuys = groupBuys.filter(
        (g) =>
          g.productId?.name?.toLowerCase().includes(search.toLowerCase()) ||
          g.title?.toLowerCase().includes(search.toLowerCase()),
      );
    }

    // Strip participant personal data for non-manufacturers
    if (session.user.role !== "manufacturer") {
      groupBuys = groupBuys.map((g) => ({
        ...g,
        participants: g.participants.map(() => ({})), // anonymize
      }));
    }

    const total = await GroupBuy.countDocuments(query);

    return NextResponse.json({
      success: true,
      groupBuys,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GroupBuy GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/group-buys - Create a new group buy campaign (manufacturer only)
export async function POST(request) {
  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.verificationStatus === "unverified") {
      return NextResponse.json(
        {
          error:
            "Only verified manufacturers can create Group Buys. Submit a verification application in Settings.",
        },
        { status: 403 },
      );
    }

    await connectDB();

    const body = await request.json();
    const {
      productId,
      title,
      description,
      basePrice,
      tiers,
      minParticipants,
      maxParticipants,
      startDate,
      endDate,
      termsAndConditions,
      joinHoldPercent,
    } = body;

    // Validate required
    if (
      !productId ||
      !title ||
      !basePrice ||
      !tiers?.length ||
      !startDate ||
      !endDate
    ) {
      return NextResponse.json(
        {
          error:
            "productId, title, basePrice, tiers, startDate, endDate are required",
        },
        { status: 400 },
      );
    }

    // Verify product belongs to this manufacturer
    const product = await Product.findOne({
      _id: productId,
      manufacturerId: session.user.id,
      status: "active",
    });
    if (!product) {
      return NextResponse.json(
        { error: "Product not found or not active" },
        { status: 404 },
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 },
      );
    }

    // Validate tiers: quantities increasing, discounts increasing, prices < base
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      if (!t.minQuantity || !t.discountPercent || !t.discountedPrice) {
        return NextResponse.json(
          { error: `Tier ${i + 1} is missing required fields` },
          { status: 400 },
        );
      }
      if (t.discountedPrice >= basePrice) {
        return NextResponse.json(
          {
            error: `Tier ${i + 1} discounted price must be less than base price`,
          },
          { status: 400 },
        );
      }
      if (i > 0) {
        if (t.minQuantity <= tiers[i - 1].minQuantity) {
          return NextResponse.json(
            { error: "Tier quantities must be strictly increasing" },
            { status: 400 },
          );
        }
        if (t.discountPercent <= tiers[i - 1].discountPercent) {
          return NextResponse.json(
            { error: "Tier discounts must be strictly increasing" },
            { status: 400 },
          );
        }
      }
    }

    const tiersWithNumbers = tiers.map((t, i) => ({ ...t, tierNumber: i + 1 }));

    const groupBuy = await GroupBuy.create({
      manufacturerId: session.user.id,
      productId,
      title,
      description,
      basePrice,
      tiers: tiersWithNumbers,
      minParticipants: minParticipants || 1,
      maxParticipants: maxParticipants || undefined,
      startDate: start,
      endDate: end,
      termsAndConditions,
      joinHoldPercent: joinHoldPercent !== undefined ? joinHoldPercent : 100,
      status: start <= new Date() ? "active" : "scheduled",
    });

    return NextResponse.json({ success: true, groupBuy }, { status: 201 });
  } catch (error) {
    console.error("GroupBuy POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

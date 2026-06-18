// app/api/rfqs/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import RFQ from "@/models/RFQ";
import CustomOrder from "@/models/CustomOrder";
import User from "@/models/User";
import Product from "@/models/Product";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";
import { resolveRequestSession } from "@/lib/requestAuth";
import { notify, createNotification } from "@/services/notificationService";

// GET /api/rfqs - List RFQs (for manufacturers)
export async function GET(request) {
  try {
    // Pass request to getServerSession
    const session = await resolveRequestSession(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    if (search) {
      const matchedOrders = await CustomOrder.find({ title: { $regex: search, $options: "i" } })
        .select("_id")
        .lean();
      query.customOrderId = { $in: matchedOrders.map((o) => o._id) };
    }

    if (session.user.role === "manufacturer") {
      // Unverified manufacturers cannot see RFQs
      if (session.user.verificationStatus === "unverified") {
        return NextResponse.json(
          {
            error:
              "Verified manufacturers only. Submit a verification application in Settings to access RFQs.",
          },
          { status: 403 },
        );
      }
      query.$or = [
        { broadcastToAll: true },
        { targetManufacturers: session.user.id },
      ];

      if (status && status !== "all") {
        query.status = status;
        if (status === "active") {
          query.endDate = { $gte: new Date() };
        }
      } else if (!status) {
        // No status param = default to active only
        query.status = "active";
        query.endDate = { $gte: new Date() };
      }
      // if status === "all", no filter applied → return everything
    }

    if (session.user.role === "customer") {
      query.customerId = session.user.id;
      if (status) query.status = status;

      // P1-C: Auto-mark expired active RFQs and fire rfqExpired notification
      // Piggybacked on customer GET to avoid a separate cron job
      const expiredRfqs = await RFQ.find({
        customerId: session.user.id,
        status: "active",
        endDate: { $lt: new Date() },
      })
        .select("_id customerId customOrderId")
        .lean();

      for (const expiredRfq of expiredRfqs) {
        await RFQ.findByIdAndUpdate(expiredRfq._id, { status: "expired" });
        const co = expiredRfq.customOrderId
          ? await CustomOrder.findById(expiredRfq.customOrderId)
              .select("title")
              .lean()
          : null;
        notify.rfqExpired(
          expiredRfq.customerId,
          expiredRfq._id,
          co?.title || "Custom Order",
        );
      }
    }

    if (
      session.user.role !== "manufacturer" &&
      session.user.role !== "customer"
    ) {
      if (status) query.status = status;
    }

    const rfqs = await RFQ.find(query)
      .populate({
        path: "customOrderId",
        select:
          "title description quantity materialPreferences deadline budget model3D images parts isPartitioned",
      })
      .populate("customerId", "name email")
      .populate("acceptedBidId")
      .populate("sourceProductId", "name images category")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await RFQ.countDocuments(query);

    return NextResponse.json({
      success: true,
      rfqs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("RFQ GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/rfqs - Create RFQ from custom order
export async function POST(request) {
  try {
    const session = await resolveRequestSession(request);

    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    if (!body.customOrderId) {
      return NextResponse.json(
        { error: "Custom order ID is required" },
        { status: 400 },
      );
    }

    const customOrder = await CustomOrder.findById(body.customOrderId);

    if (!customOrder) {
      return NextResponse.json(
        { error: "Custom order not found" },
        { status: 404 },
      );
    }

    if (customOrder.customerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (customOrder.rfqId) {
      return NextResponse.json(
        { error: "RFQ already created for this order" },
        { status: 400 },
      );
    }

    const duration = body.duration ? Number(body.duration) : 168;
    if (!Number.isInteger(duration) || duration < 24 || duration > 720) {
      return NextResponse.json(
        { error: "Duration must be an integer between 24 and 720 hours (30 days)" },
        { status: 400 },
      );
    }

    if (body.minBidThreshold !== undefined && body.minBidThreshold !== null && body.minBidThreshold !== "") {
      const minBidThreshold = Number(body.minBidThreshold);
      if (isNaN(minBidThreshold) || minBidThreshold < 0) {
        return NextResponse.json(
          { error: "Minimum bid threshold must be a non-negative number" },
          { status: 400 },
        );
      }
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);

    const rawTargets = Array.isArray(body.targetManufacturers)
      ? body.targetManufacturers
      : [];

    const targetManufacturers = [
      ...new Set(rawTargets.map(String).filter(Boolean)),
    ];

    const hasInvalidTargetIds = targetManufacturers.some(
      (manufacturerId) => !mongoose.Types.ObjectId.isValid(manufacturerId),
    );

    if (hasInvalidTargetIds) {
      return NextResponse.json(
        { error: "One or more target manufacturer IDs are invalid" },
        { status: 400 },
      );
    }

    let broadcastToAll = body.broadcastToAll !== false;
    const linkedManufacturerId = customOrder.sourceManufacturerId?.toString();

    const isProductCustomization =
      customOrder.sourceType === "product_customization";
    const sourceProductId = isProductCustomization
      ? customOrder.sourceProductId
      : undefined;

    if (isProductCustomization) {
      if (!linkedManufacturerId) {
        return NextResponse.json(
          {
            error: "Linked manufacturer is required for product customization",
          },
          { status: 400 },
        );
      }

      const extraTargets = targetManufacturers.filter(
        (id) => id !== linkedManufacturerId,
      );

      if (body.broadcastToAll === true || extraTargets.length > 0) {
        return NextResponse.json(
          {
            error:
              "Product customization RFQs must target only the original manufacturer",
          },
          { status: 400 },
        );
      }

      broadcastToAll = false;
      targetManufacturers.length = 0;
      targetManufacturers.push(linkedManufacturerId);
    } else if (linkedManufacturerId && body.broadcastToAll === undefined) {
      // Product-linked and direct-manufacturer requests default to scoped RFQs.
      broadcastToAll = false;
    }

    if (!broadcastToAll && linkedManufacturerId) {
      targetManufacturers.push(linkedManufacturerId);
    }

    const uniqueTargetManufacturers = [...new Set(targetManufacturers)];

    if (!broadcastToAll && uniqueTargetManufacturers.length === 0) {
      return NextResponse.json(
        {
          error:
            "Please select at least one manufacturer when broadcast is disabled",
        },
        { status: 400 },
      );
    }

    if (uniqueTargetManufacturers.length > 0) {
      const validManufacturers = await User.find({
        _id: { $in: uniqueTargetManufacturers },
        role: "manufacturer",
        isActive: true,
        verificationStatus: "verified",
      })
        .select("_id")
        .lean();

      if (validManufacturers.length !== uniqueTargetManufacturers.length) {
        return NextResponse.json(
          {
            error:
              "One or more selected manufacturers are not active verified manufacturers",
          },
          { status: 400 },
        );
      }
    }

    const finalTargetManufacturers = broadcastToAll
      ? []
      : uniqueTargetManufacturers;

    const rfq = await RFQ.create({
      customOrderId: customOrder._id,
      customerId: session.user.id,
      duration,
      startDate,
      endDate,
      status: "active",
      minBidThreshold: body.minBidThreshold || 0,
      targetManufacturers: finalTargetManufacturers,
      broadcastToAll,
      isProductCustomization,
      sourceProductId,
    });

    customOrder.rfqId = rfq._id;
    customOrder.status = "rfq_created";
    await customOrder.save();

    const populatedRFQ = await RFQ.findById(rfq._id)
      .populate({
        path: "customOrderId",
        select:
          "title description quantity materialPreferences deadline budget model3D images",
      })
      .lean();

    // P1-C: Notify manufacturers about the new RFQ
    const rfqTitle = customOrder.title || "Custom Order";
    if (isProductCustomization) {
      for (const mfrId of finalTargetManufacturers) {
        createNotification({
          userId: mfrId,
          type: "product_customization_rfq",
          title: "Customization Request for Your Product",
          message: `A customer wants to customize "${rfqTitle}". Review and bid.`,
          link: `/manufacturer/rfqs/${rfq._id}`,
          relatedType: "rfq",
          relatedId: rfq._id,
        });
      }
    } else if (broadcastToAll) {
      // Notify all verified active manufacturers (fire-and-forget, errors swallowed)
      const allManufacturers = await User.find({
        role: "manufacturer",
        isActive: true,
        verificationStatus: "verified",
      })
        .select("_id")
        .lean();
      for (const mfr of allManufacturers) {
        notify.rfqCreated(mfr._id, rfq._id, rfqTitle);
      }
    } else {
      for (const mfrId of finalTargetManufacturers) {
        notify.rfqCreated(mfrId, rfq._id, rfqTitle);
      }
    }

    return NextResponse.json(
      {
        success: true,
        rfq: populatedRFQ,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("RFQ POST Error:", error);

    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 },
    );
  }
}

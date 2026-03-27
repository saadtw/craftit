import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import RFQ from "@/models/RFQ";
import CustomOrder from "@/models/CustomOrder";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET - List RFQs (for manufacturers)
export async function GET(request) {
  try {
    // Pass request to getServerSession
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    if (session.user.role === "manufacturer") {
      // Unverified manufacturers cannot see RFQs
      if (session.user.verificationStatus === "unverified") {
        return NextResponse.json(
          { error: "Verified manufacturers only. Submit a verification application in Settings to access RFQs." },
          { status: 403 },
        );
      }
      query.status = "active";
      query.endDate = { $gte: new Date() };
    }

    if (session.user.role === "customer") {
      query.customerId = session.user.id;
    }

    if (status) query.status = status;

    const rfqs = await RFQ.find(query)
      .populate({
        path: "customOrderId",
        select:
          "title description quantity materialPreferences deadline budget model3D images",
      })
      .populate("customerId", "name email")
      .populate("acceptedBidId")
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

// POST - Create RFQ from custom order
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

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

    const startDate = new Date();
    const duration = body.duration || 168;
    const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);

    const rfq = await RFQ.create({
      customOrderId: customOrder._id,
      customerId: session.user.id,
      duration,
      startDate,
      endDate,
      status: "active",
      minBidThreshold: body.minBidThreshold || 0,
      targetManufacturers: body.targetManufacturers || [],
      broadcastToAll: body.broadcastToAll !== false,
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

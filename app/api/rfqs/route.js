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
    const category = searchParams.get("category");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    if (session.user.role === "manufacturer") {
      query.status = "active";
      query.endDate = { $gte: new Date() };
    }

    if (session.user.role === "customer") {
      query.customerId = session.user.id;
    }

    if (status) query.status = status;
    if (category) query.category = category;

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
  console.log("=== RFQ POST Request Started ===");

  try {
    console.log("1. Getting session...");
    const session = await getServerSession(authOptions);
    console.log("Session retrieved:", session ? "Yes" : "No");
    console.log("Session details:", JSON.stringify(session, null, 2));

    if (!session || session.user.role !== "customer") {
      console.log("Auth failed - session:", session);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("2. Connecting to DB...");
    await connectDB();
    console.log("DB connected");

    console.log("3. Parsing request body...");
    const body = await request.json();
    console.log("Body:", body);

    if (!body.customOrderId) {
      return NextResponse.json(
        { error: "Custom order ID is required" },
        { status: 400 }
      );
    }

    console.log("4. Finding custom order...");
    const customOrder = await CustomOrder.findById(body.customOrderId);
    console.log("Custom order found:", customOrder ? "Yes" : "No");

    if (!customOrder) {
      return NextResponse.json(
        { error: "Custom order not found" },
        { status: 404 }
      );
    }

    console.log("5. Checking ownership...");
    if (customOrder.customerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (customOrder.rfqId) {
      return NextResponse.json(
        { error: "RFQ already created for this order" },
        { status: 400 }
      );
    }

    console.log("6. Creating RFQ...");
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
    console.log("RFQ created:", rfq._id);

    console.log("7. Updating custom order...");
    customOrder.rfqId = rfq._id;
    customOrder.status = "rfq_created";
    await customOrder.save();
    console.log("Custom order updated");

    console.log("8. Populating RFQ...");
    const populatedRFQ = await RFQ.findById(rfq._id)
      .populate({
        path: "customOrderId",
        select:
          "title description quantity materialPreferences deadline budget model3D images",
      })
      .lean();
    console.log("RFQ populated");

    console.log("9. Returning response...");
    return NextResponse.json(
      {
        success: true,
        rfq: populatedRFQ,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("=== RFQ POST ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error name:", error.name);
    console.error("Error stack:", error.stack);
    console.error("Full error:", error);

    return NextResponse.json(
      {
        error: error.message,
        name: error.name,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

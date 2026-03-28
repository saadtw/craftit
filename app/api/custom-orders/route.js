import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import CustomOrder from "@/models/CustomOrder";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - List customer's custom orders
export async function GET(request) {
  try {
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

    let query = { customerId: session.user.id };
    if (status) {
      query.status = status;
    }

    const orders = await CustomOrder.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await CustomOrder.countDocuments(query);

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new custom order
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    // Validation
    if (!body.title || !body.description || !body.quantity) {
      return NextResponse.json(
        { error: "Title, description and quantity are required" },
        { status: 400 }
      );
    }

    const customOrder = await CustomOrder.create({
      customerId: session.user.id,
      title: body.title,
      description: body.description,
      quantity: body.quantity,
      materialPreferences: body.materialPreferences || [],
      colorSpecifications: body.colorSpecifications || [],
      deadline: body.deadline,
      model3D: body.model3D || null,
      images: body.images || [],
      specialRequirements: body.specialRequirements,
      budget: body.budget,
      items: body.items || [],
      status: body.status || "draft",
    });

    return NextResponse.json(
      {
        success: true,
        order: customOrder,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import CustomOrder from "@/models/CustomOrder";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveRequestSession } from "@/lib/requestAuth";
import RFQ from "@/models/RFQ";

// GET /api/custom-orders/[id] - Get single custom order
export async function GET(request, context) {
  const params = await context.params;
  const id = params.id;

  try {
    const session = await resolveRequestSession(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const order = await CustomOrder.findById(id)
      .populate("customerId", "name email")
      .populate("sourceProductId", "name manufacturerId customizationOptions")
      .populate("sourceManufacturerId", "name businessName")
      .populate("rfqId")
      .lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check ownership
    if (order.customerId._id.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/custom-orders/[id] - Update custom order
export async function PUT(request, context) {
  const params = await context.params;
  const id = params.id;

  try {
    const session = await resolveRequestSession(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const order = await CustomOrder.findById(id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check ownership
    if (order.customerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can only update drafts
    if (order.status !== "draft") {
      return NextResponse.json(
        {
          error: "Can only update draft orders",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Update only allowed fields
    const updateData = {};
    const allowedFields = [
      "title",
      "description",
      "quantity",
      "materialPreferences",
      "colorSpecifications",
      "deadline",
      "model3D",
      "images",
      "specialRequirements",
      "budget",
      "items",
      "status",
      "requestedCustomizationTypes",
      "customizationDetails",
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    const updatedOrder = await CustomOrder.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/custom-orders/[id] - Delete custom order
export async function DELETE(request, context) {
  const params = await context.params;
  const id = params.id;

  try {
    const session = await resolveRequestSession(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const order = await CustomOrder.findById(id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check ownership
    if (order.customerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can only delete drafts
    if (order.status !== "draft") {
      return NextResponse.json(
        {
          error: "Can only delete draft orders",
        },
        { status: 400 },
      );
    }

    await CustomOrder.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Order deleted",
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

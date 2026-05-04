import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import { resolveRequestSession } from "@/lib/requestAuth";

// GET  /api/orders/[id]/milestones - Get order milestones
export async function GET(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const order = await Order.findById(id)
      .select("milestones status customerId manufacturerId")
      .lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isCustomer =
      session.user.role === "customer" &&
      order.customerId.toString() === session.user.id;
    const isManufacturer =
      session.user.role === "manufacturer" &&
      order.manufacturerId.toString() === session.user.id;
    const isAdmin = session.user.role === "admin";

    if (!isCustomer && !isManufacturer && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, milestones: order.milestones });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/orders/[id]/milestones - Add a new milestone (manufacturer only)
export async function POST(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { name, description, dueDate } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Milestone name is required" },
        { status: 400 },
      );
    }

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.manufacturerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (order.cancellationStatus === "requested") {
      return NextResponse.json(
        {
          error:
            "This order has a pending cancellation request. Resolve it before modifying milestones.",
        },
        { status: 409 },
      );
    }

    const milestone = {
      name,
      description: description || "",
      status: "pending",
      dueDate: dueDate ? new Date(dueDate) : undefined,
    };

    order.milestones.push(milestone);
    await order.save();

    return NextResponse.json({
      success: true,
      milestones: order.milestones,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/orders/[id]/milestones - Update a specific milestone (manufacturer or customer)
export async function PUT(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session || !["manufacturer", "customer"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { milestoneId, status, notes, photos, customerStatus } = body;

    if (!milestoneId) {
      return NextResponse.json(
        { error: "milestoneId is required" },
        { status: 400 },
      );
    }

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isCustomer = session.user.role === "customer" && order.customerId.toString() === session.user.id;
    const isManufacturer = session.user.role === "manufacturer" && order.manufacturerId.toString() === session.user.id;

    if (!isCustomer && !isManufacturer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (order.cancellationStatus === "requested") {
      return NextResponse.json(
        {
          error:
            "This order has a pending cancellation request. Resolve it before modifying milestones.",
        },
        { status: 409 },
      );
    }

    const milestone = order.milestones.id(milestoneId);
    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 },
      );
    }

    if (isManufacturer) {
      if (status) milestone.status = status;
      if (notes) milestone.notes = notes;
      if (photos) milestone.photos = photos;
      
      if (status === "completed") {
        milestone.completedAt = new Date();
        milestone.customerStatus = "awaiting_confirmation";
      }

      // Auto-advance order to in_production once any milestone becomes in_progress
      if (status === "in_progress" && order.status === "accepted") {
        order.status = "in_production";
      }
    } else if (isCustomer) {
      if (customerStatus) {
        if (milestone.customerStatus !== "awaiting_confirmation" && milestone.customerStatus !== "disputed") {
          return NextResponse.json({ error: "Milestone is not awaiting confirmation" }, { status: 400 });
        }
        milestone.customerStatus = customerStatus;
        if (customerStatus === "confirmed") {
          milestone.customerConfirmedAt = new Date();
        }
      }
    }

    await order.save();

    return NextResponse.json({
      success: true,
      milestones: order.milestones,
      orderStatus: order.status,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

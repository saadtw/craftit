import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import GroupBuy from "@/models/GroupBuy";
import Product from "@/models/Product";
import { resolveRequestSession } from "@/lib/requestAuth";

// GET /api/group-buys/[id] - Single group buy detail
export async function GET(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const groupBuy = await GroupBuy.findById(id)
      .populate(
        "productId",
        "name images category price specifications description moq model3D",
      )
      .populate(
        "manufacturerId",
        "name businessName businessLogo verificationStatus",
      )
      .lean();

    if (!groupBuy) {
      return NextResponse.json(
        { error: "Group buy not found" },
        { status: 404 },
      );
    }

    // Manufacturers can only view their own
    if (
      session.user.role === "manufacturer" &&
      groupBuy.manufacturerId._id.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Anonymize participants for non-owners
    if (
      session.user.role !== "manufacturer" ||
      groupBuy.manufacturerId._id.toString() !== session.user.id
    ) {
      groupBuy.participants = groupBuy.participants.map((p) => ({
        quantity: p.quantity,
        joinedAt: p.joinedAt,
        // no customerId, no payment info
      }));
    }

    return NextResponse.json({ success: true, groupBuy });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update group buy (manufacturer only, only if not started yet or for allowed fields)
export async function PUT(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const groupBuy = await GroupBuy.findById(id);
    if (!groupBuy) {
      return NextResponse.json(
        { error: "Group buy not found" },
        { status: 404 },
      );
    }
    if (groupBuy.manufacturerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Cancelled campaigns cannot be edited
    if (groupBuy.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot edit a cancelled campaign" },
        { status: 400 },
      );
    }

    // If campaign has already started and has participants, only allow endDate extension
    const hasParticipants = groupBuy.participants.length > 0;
    const hasStarted = ["active", "paused", "completed", "cancelled"].includes(
      groupBuy.status,
    );

    if (hasStarted && hasParticipants) {
      // Only allow extending endDate
      if (body.endDate) {
        const newEnd = new Date(body.endDate);
        if (newEnd <= groupBuy.endDate) {
          return NextResponse.json(
            { error: "New end date must be later than current end date" },
            { status: 400 },
          );
        }
        groupBuy.endDate = newEnd;
        // Reactivate if it was completed due to time
        if (groupBuy.status === "completed" && !groupBuy.completedAt) {
          groupBuy.status = "active";
        }
        await groupBuy.save();
        return NextResponse.json({ success: true, groupBuy });
      }
      return NextResponse.json(
        {
          error:
            "Cannot edit a campaign that has already started and has participants",
        },
        { status: 400 },
      );
    }

    // Full edit allowed before participants join
    const allowedFields = [
      "title",
      "description",
      "basePrice",
      "tiers",
      "minParticipants",
      "maxParticipants",
      "startDate",
      "endDate",
      "termsAndConditions",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        groupBuy[field] = body[field];
      }
    }

    // Re-validate tiers if changed
    if (body.tiers) {
      const tiers = body.tiers;
      for (let i = 1; i < tiers.length; i++) {
        if (
          tiers[i].minQuantity <= tiers[i - 1].minQuantity ||
          tiers[i].discountPercent <= tiers[i - 1].discountPercent
        ) {
          return NextResponse.json(
            {
              error:
                "Tiers must have strictly increasing quantities and discounts",
            },
            { status: 400 },
          );
        }
      }
      groupBuy.tiers = tiers.map((t, i) => ({ ...t, tierNumber: i + 1 }));
    }

    if (body.startDate) {
      const start = new Date(body.startDate);
      groupBuy.status = start <= new Date() ? "active" : "scheduled";
    }

    await groupBuy.save();
    return NextResponse.json({ success: true, groupBuy });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/group-buys/[id] - Cancel a group buy
export async function DELETE(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "manufacturer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const groupBuy = await GroupBuy.findById(id);
    if (!groupBuy) {
      return NextResponse.json(
        { error: "Group buy not found" },
        { status: 404 },
      );
    }
    if (groupBuy.manufacturerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (groupBuy.status === "completed") {
      return NextResponse.json(
        { error: "Cannot cancel a completed campaign" },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));

    groupBuy.status = "cancelled";
    groupBuy.cancelledAt = new Date();
    groupBuy.cancelReason = body.reason || "Cancelled by manufacturer";
    await groupBuy.save();

    // NOTE: Actual payment refunds to participants would be triggered here
    // via a payment service. Skipping payment integration for now.

    return NextResponse.json({
      success: true,
      message: "Group buy cancelled. Participant refunds should be processed.",
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

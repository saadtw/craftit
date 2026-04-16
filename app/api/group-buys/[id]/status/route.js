import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import GroupBuy from "@/models/GroupBuy";
import { resolveRequestSession } from "@/lib/requestAuth";

// PATCH /api/group-buys/[id]/status - Control campaign status: pause, resume, end_early
export async function PATCH(request, context) {
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

    const { action } = await request.json();

    switch (action) {
      case "pause":
        if (groupBuy.status !== "active") {
          return NextResponse.json(
            { error: "Only active campaigns can be paused" },
            { status: 400 },
          );
        }
        groupBuy.status = "paused";
        break;

      case "resume":
        if (groupBuy.status !== "paused") {
          return NextResponse.json(
            { error: "Only paused campaigns can be resumed" },
            { status: 400 },
          );
        }
        groupBuy.status = "active";
        break;

      case "end_early":
        if (!["active", "paused"].includes(groupBuy.status)) {
          return NextResponse.json(
            { error: "Campaign is not active or paused" },
            { status: 400 },
          );
        }
        groupBuy.status = "completed";
        groupBuy.completedAt = new Date();
        groupBuy.endDate = new Date(); // set end to now
        // NOTE: Order creation for participants would be triggered here
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: pause, resume, end_early" },
          { status: 400 },
        );
    }

    await groupBuy.save();

    return NextResponse.json({
      success: true,
      status: groupBuy.status,
      message: `Campaign ${action.replace("_", " ")} successful`,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

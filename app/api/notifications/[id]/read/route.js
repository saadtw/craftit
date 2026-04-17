import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { resolveRequestSession } from "@/lib/requestAuth";

// PATCH /api/notifications/[id]/read - Mark a notification as read
export async function PATCH(request, context) {
  try {
    const { id } = await context.params;

    const session = await resolveRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid notification id" },
        { status: 400 },
      );
    }

    await connectDB();

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { isRead: true, readAt: new Date() },
      { new: true },
    );

    if (!notification) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ notification });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

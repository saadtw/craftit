import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";

// PATCH /api/notifications/[id]/read - Mark a notification as read
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const notification = await Notification.findOneAndUpdate(
      { _id: params.id, userId: session.user.id },
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

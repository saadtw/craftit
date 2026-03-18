import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

// PATCH /api/users/[id] — update own profile (name, phone, bio, address)
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Users may only update their own profile
    if (session.user.id !== params.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    await connectDB();

    const body = await request.json();

    const allowed = ["name", "phone", "bio", "address"];
    const update = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        update[key] = body[key];
      }
    }

    if (update.name !== undefined) {
      update.name = String(update.name).trim();
      if (!update.name) {
        return NextResponse.json(
          { success: false, error: "Name cannot be empty" },
          { status: 400 },
        );
      }
    }

    const user = await User.findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("User PATCH error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Update failed" },
      { status: 500 },
    );
  }
}

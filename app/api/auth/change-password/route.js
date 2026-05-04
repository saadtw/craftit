import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { resolveRequestSession } from "@/lib/requestAuth";

// POST /api/auth/change-password — change password for logged-in user
export async function POST(request) {
  try {
    const session = await resolveRequestSession(request);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { currentPassword, newPassword } = await request.json();

    if (!newPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "New password is required",
        },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 8 characters" },
        { status: 400 },
      );
    }

    await connectDB();

    // Fetch with password field explicitly selected
    const user = await User.findById(session.user.id).select(
      "+password authMethod oauthProviders",
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const hasLocalPassword = Boolean(user.password);

    if (hasLocalPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          {
            success: false,
            error: "Current password is required to change your password",
          },
          { status: 400 },
        );
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return NextResponse.json(
          { success: false, error: "Current password is incorrect" },
          { status: 400 },
        );
      }
    }

    // Hash and save new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    // Mark modified so the pre-save hook does NOT re-hash (we already hashed)
    user.markModified("password");
    // Bypass the pre-save hook by using direct save with a flag
    await User.findByIdAndUpdate(user._id, {
      $set: { password: user.password },
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Password update failed" },
      { status: 500 },
    );
  }
}

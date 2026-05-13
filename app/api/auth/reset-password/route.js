import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/auth/reset-password
// Receives the access_token from Supabase's reset link + new password.
export async function POST(request) {
  try {
    const { access_token, password, confirmPassword } = await request.json();

    if (!access_token || !password || !confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Token, password and confirm password are required",
        },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: "Passwords do not match" },
        { status: 400 },
      );
    }

    // 1. Verify the access token to identify the user
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.getUser(access_token);

    if (userError || !userData?.user) {
      return NextResponse.json(
        { success: false, message: "Reset link is invalid or has expired" },
        { status: 400 },
      );
    }

    // 2. Update the password in Supabase
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(userData.user.id, {
        password,
      });

    if (updateError) {
      console.error("Supabase password update error:", updateError);
      return NextResponse.json(
        { success: false, message: "Unable to reset password" },
        { status: 500 },
      );
    }

    // 3. Increment sessionVersion in MongoDB to invalidate old sessions
    await connectDB();
    await User.findOneAndUpdate(
      { supabaseId: userData.user.id },
      { $inc: { sessionVersion: 1 } },
    );

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to reset password" },
      { status: 500 },
    );
  }
}

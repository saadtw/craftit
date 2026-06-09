import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveRequestSession } from "@/lib/requestAuth";

export async function POST(request) {
  try {
    const session = await resolveRequestSession(request);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 },
      );
    }

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (password.length < 8 || !hasLower || !hasUpper || !hasNumber) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password must be at least 8 characters and include upper, lower, and number",
        },
        { status: 400 },
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id).select(
      "supabaseId needsPasswordSetup",
    );
    if (!user || !user.supabaseId) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    if (!user.needsPasswordSetup) {
      return NextResponse.json(
        {
          success: false,
          error: "Password setup is not required for this account",
        },
        { status: 400 },
      );
    }

    // Update password in Supabase
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      user.supabaseId,
      { password: password },
    );

    if (updateErr) {
      console.error("Supabase password update error:", updateErr);
      return NextResponse.json(
        { success: false, error: "Password setup failed" },
        { status: 500 },
      );
    }

    // Update MongoDB
    user.needsPasswordSetup = false;
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Password set successfully",
    });
  } catch (error) {
    console.error("Setup password error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Password setup failed" },
      { status: 500 },
    );
  }
}

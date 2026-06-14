import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { supabaseAdmin } from "@/lib/supabase";
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
        { success: false, error: "New password is required" },
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

    const user = await User.findById(session.user.id).select("supabaseId");
    if (!user || !user.supabaseId) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Verify current password by attempting a sign-in against Supabase
    if (currentPassword) {
      // Create a fresh client so we don't mutate global server state
      const { createClient } = require("@supabase/supabase-js");
      const tempSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        { auth: { persistSession: false } }
      );

      const { error: signInErr } = await tempSupabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      });

      if (signInErr) {
        return NextResponse.json(
          { success: false, error: "Current password is incorrect" },
          { status: 400 },
        );
      }
    }

    // Update password in Supabase
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      user.supabaseId,
      { password: newPassword },
    );

    if (updateErr) {
      console.error("Supabase password update error:", updateErr);
      return NextResponse.json(
        { success: false, error: "Password update failed" },
        { status: 500 },
      );
    }

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

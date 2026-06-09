import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveRequestSession } from "@/lib/requestAuth";

// POST /api/auth/oauth/set-password
// Sets a password in Supabase for a Google OAuth user who doesn't have one yet.
// Body: { password: string }
export async function POST(request) {
  try {
    const session = await resolveRequestSession(request);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const password = String(body?.password || "").trim();

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (password.length < 8 || !hasLower || !hasUpper || !hasNumber) {
      return NextResponse.json(
        {
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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.needsPasswordSetup) {
      return NextResponse.json(
        { error: "Password setup is not required for this account" },
        { status: 400 },
      );
    }

    // Set the password in Supabase
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      user.supabaseId,
      { password },
    );

    if (updateErr) {
      console.error("Supabase set-password error:", updateErr);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    user.needsPasswordSetup = false;
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Password set successfully.",
    });
  } catch (error) {
    console.error("Set password error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

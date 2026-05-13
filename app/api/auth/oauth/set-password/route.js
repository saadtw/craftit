import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { supabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST /api/auth/oauth/set-password
// Sets a password in Supabase for a Google OAuth user who doesn't have one yet.
// Body: { password: string }
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const password = String(body?.password || "").trim();

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id).select("supabaseId");
    if (!user || !user.supabaseId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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

    // Increment session version to force re-login
    await User.findByIdAndUpdate(user._id, {
      $inc: { sessionVersion: 1 },
    });

    return NextResponse.json({
      success: true,
      message: "Password set successfully. Please sign in again.",
    });
  } catch (error) {
    console.error("Set password error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

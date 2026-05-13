import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/auth/verify-email
// Body: { token } — link-based verification (Supabase handles this via redirect,
// but we keep this endpoint for backwards compatibility)
export async function POST(request) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Verification token is required" },
        { status: 400 },
      );
    }

    // For Supabase link-based verification, the token is exchanged automatically.
    // This endpoint syncs the MongoDB side if called after Supabase confirms.
    // If a valid Supabase access token is passed, we can verify the user.
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {
      return NextResponse.json(
        { success: false, message: "Verification link is invalid or expired" },
        { status: 400 },
      );
    }

    if (!data.user.email_confirmed_at) {
      return NextResponse.json(
        { success: false, message: "Email has not been confirmed yet" },
        { status: 400 },
      );
    }

    await connectDB();
    const user = await User.findOne({
      email: data.user.email.toLowerCase().trim(),
    });

    if (user && !user.isEmailVerified) {
      user.isEmailVerified = true;
      user.emailVerifiedAt = new Date(data.user.email_confirmed_at);
      await user.save();
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully. You can now login.",
    });
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to verify email" },
      { status: 500 },
    );
  }
}

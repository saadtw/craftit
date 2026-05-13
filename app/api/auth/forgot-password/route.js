import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/auth/forgot-password
// Triggers Supabase to send a password reset email
export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 },
      );
    }

    // Supabase sends the reset email automatically
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(
      email.toLowerCase().trim(),
      {
        redirectTo: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/reset-password`,
      },
    );

    if (error) {
      console.error("Supabase forgot-password error:", error);
      // Don't reveal if the email exists or not
    }

    // Always return a generic success response to avoid email enumeration.
    return NextResponse.json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to process forgot password request" },
      { status: 500 },
    );
  }
}

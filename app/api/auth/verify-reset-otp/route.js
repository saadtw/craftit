import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/auth/verify-reset-otp
// Verifies a 8-digit OTP sent to the user's email for password recovery
export async function POST(request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: "Email and OTP are required" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify the OTP via Supabase
    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      email: normalizedEmail,
      token: String(otp).trim(),
      type: "recovery",
    });

    if (error) {
      if (error.message?.includes("expired")) {
        return NextResponse.json(
          {
            success: false,
            message: "Code has expired. Please request a new one.",
          },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { success: false, message: "Invalid verification code." },
        { status: 400 },
      );
    }

    // Return the access token so the client can navigate to reset-password and use it
    return NextResponse.json({
      success: true,
      message: "Code verified successfully.",
      access_token: data.session?.access_token,
    });
  } catch (error) {
    console.error("verify-reset-otp error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to verify code" },
      { status: 500 },
    );
  }
}

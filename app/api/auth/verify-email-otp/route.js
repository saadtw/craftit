import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/auth/verify-email-otp
// Body: { email, otp }
// Verifies the OTP code that Supabase sent during signup
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
      type: "signup",
    });

    if (error) {
      // Map common Supabase errors to user-friendly messages
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

    // Update MongoDB profile to reflect verified status
    await connectDB();
    const user = await User.findOne({ email: normalizedEmail });

    if (user && !user.isEmailVerified) {
      user.isEmailVerified = true;
      user.emailVerifiedAt = new Date();
      await user.save();
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    console.error("verify-email-otp error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to verify email" },
      { status: 500 },
    );
  }
}

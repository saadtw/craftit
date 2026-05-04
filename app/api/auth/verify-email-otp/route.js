import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { hashToken } from "@/lib/token";

const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCK_DURATION_MS = 60 * 60 * 1000; // 1 hour

// POST /api/auth/verify-email-otp
// Body: { email, otp }
export async function POST(request) {
  try {
    await connectDB();

    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: "Email and OTP are required" },
        { status: 400 },
      );
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select(
      "+emailOtp +emailOtpExpires +otpFailCount +otpLockUntil isEmailVerified",
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired code" },
        { status: 400 },
      );
    }

    if (user.isEmailVerified) {
      return NextResponse.json({
        success: true,
        message: "Email is already verified.",
      });
    }

    // Check if account is locked due to too many failed attempts
    if (user.otpLockUntil && user.otpLockUntil > new Date()) {
      const minutesLeft = Math.ceil((user.otpLockUntil - Date.now()) / 60000);
      return NextResponse.json(
        {
          success: false,
          message: `Too many failed attempts. Try again in ${minutesLeft} minute(s).`,
          locked: true,
        },
        { status: 429 },
      );
    }

    // Check OTP exists and is not expired
    if (
      !user.emailOtp ||
      !user.emailOtpExpires ||
      user.emailOtpExpires < new Date()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Code has expired. Please request a new one.",
        },
        { status: 400 },
      );
    }

    const hashedInput = hashToken(String(otp).trim());

    if (user.emailOtp !== hashedInput) {
      user.otpFailCount = (user.otpFailCount || 0) + 1;

      if (user.otpFailCount >= OTP_MAX_ATTEMPTS) {
        user.otpLockUntil = new Date(Date.now() + OTP_LOCK_DURATION_MS);
        user.emailOtp = undefined;
        user.emailOtpExpires = undefined;
        await user.save();

        return NextResponse.json(
          {
            success: false,
            message:
              "Too many failed attempts. Verification locked for 1 hour.",
            locked: true,
          },
          { status: 429 },
        );
      }

      await user.save();

      const remaining = OTP_MAX_ATTEMPTS - user.otpFailCount;
      return NextResponse.json(
        {
          success: false,
          message: `Invalid code. ${remaining} attempt(s) remaining.`,
          attemptsRemaining: remaining,
        },
        { status: 400 },
      );
    }

    // OTP is valid — verify the user
    user.isEmailVerified = true;
    user.emailVerifiedAt = new Date();
    user.emailOtp = undefined;
    user.emailOtpExpires = undefined;
    user.otpFailCount = 0;
    user.otpLockUntil = undefined;
    await user.save();

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

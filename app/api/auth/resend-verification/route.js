import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { createNumericCode, hashToken } from "@/lib/token";
import { sendOtpEmail } from "@/lib/email";

const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

export async function POST(request) {
  try {
    await connectDB();

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 },
      );
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select(
      "+emailOtp +emailOtpExpires +otpResendAt +otpFailCount +otpLockUntil isEmailVerified email name",
    );

    // Always return a vague success to avoid email enumeration
    if (!user || user.isEmailVerified) {
      return NextResponse.json({
        success: true,
        message:
          "If your account exists and is unverified, a new code has been sent.",
      });
    }

    // Check resend cooldown
    if (
      user.otpResendAt &&
      user.otpResendAt > new Date(Date.now() - RESEND_COOLDOWN_MS)
    ) {
      const secondsLeft = Math.ceil(
        (user.otpResendAt.getTime() + RESEND_COOLDOWN_MS - Date.now()) / 1000,
      );
      return NextResponse.json(
        {
          success: false,
          message: `Please wait ${secondsLeft} second(s) before requesting a new code.`,
          retryAfterSeconds: secondsLeft,
        },
        { status: 429 },
      );
    }

    const otp = createNumericCode(6);
    user.emailOtp = hashToken(otp);
    user.emailOtpExpires = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes
    user.otpResendAt = new Date();
    user.otpFailCount = 0;
    user.otpLockUntil = undefined;
    await user.save();

    await sendOtpEmail({
      to: user.email,
      name: user.name,
      otp,
    });

    return NextResponse.json({
      success: true,
      message:
        "If your account exists and is unverified, a new code has been sent.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to process request" },
      { status: 500 },
    );
  }
}

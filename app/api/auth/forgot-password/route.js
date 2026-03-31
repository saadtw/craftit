import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { createRawToken, hashToken } from "@/lib/token";
import { sendPasswordResetEmail } from "@/lib/email";

// POST /api/auth/forgot-password
// Generates a short-lived reset token. In production this should be emailed.
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

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always return a generic success response to avoid email enumeration.
    if (!user) {
      return NextResponse.json({
        success: true,
        message:
          "If an account with that email exists, a reset link has been generated.",
      });
    }

    const rawToken = createRawToken(32);
    const hashedToken = hashToken(rawToken);

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes
    await user.save();

    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      token: rawToken,
    });

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

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { hashToken } from "@/lib/token";

export async function POST(request) {
  try {
    await connectDB();

    const { token } = await request.json();
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Verification token is required" },
        { status: 400 },
      );
    }

    const hashedToken = hashToken(token);

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    }).select(
      "+emailVerificationToken +emailVerificationExpires isEmailVerified",
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Verification link is invalid or expired" },
        { status: 400 },
      );
    }

    user.isEmailVerified = true;
    user.emailVerifiedAt = new Date();
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

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

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { createRawToken, hashToken } from "@/lib/token";
import { sendVerificationEmail } from "@/lib/email";

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
    }).select("isEmailVerified email name");

    if (!user || user.isEmailVerified) {
      return NextResponse.json({
        success: true,
        message:
          "If your account exists and is not verified, a verification email has been sent.",
      });
    }

    const rawToken = createRawToken(32);
    user.emailVerificationToken = hashToken(rawToken);
    user.emailVerificationExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);
    await user.save();

    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      token: rawToken,
    });

    return NextResponse.json({
      success: true,
      message:
        "If your account exists and is not verified, a verification email has been sent.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to process request" },
      { status: 500 },
    );
  }
}

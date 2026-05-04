import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { createNumericCode, hashToken } from "@/lib/token";
import { sendOtpEmail } from "@/lib/email";

// POST /api/auth/register/customer  — register a new customer
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { name, email, password, phone, location } = body;
    const normalizedEmail = email?.toLowerCase().trim();

    // Validation
    if (!name || !normalizedEmail || !password) {
      return NextResponse.json(
        { success: false, message: "Name, email and password are required" },
        { status: 400 },
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, message: "Invalid email format" },
        { status: 400 },
      );
    }

    // Password validation (minimum 6 characters)
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      // Check if user exists via OAuth only
      if (existingUser.authMethod === "oauth" && !existingUser.password) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This email is already registered via Google. Please sign in with Google instead.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { success: false, message: "Email already registered" },
        { status: 409 },
      );
    }

    const user = await User.create({
      role: "customer",
      name,
      email: normalizedEmail,
      password,
      authMethod: "credentials",
      phone,
      location: location || {},
      isActive: true,
      isEmailVerified: false,
    });

    const otp = createNumericCode(6);
    user.emailOtp = hashToken(otp);
    user.emailOtpExpires = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes
    user.otpFailCount = 0;
    await user.save();

    await sendOtpEmail({
      to: user.email,
      name: user.name,
      otp,
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Customer registered successfully. A 6-digit verification code has been sent to your email.",
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Customer registration error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

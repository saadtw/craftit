import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { createRawToken, hashToken } from "@/lib/token";
import { sendVerificationEmail } from "@/lib/email";

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
      phone,
      location: location || {},
      isActive: true,
      isEmailVerified: false,
    });

    const rawVerificationToken = createRawToken(32);
    user.emailVerificationToken = hashToken(rawVerificationToken);
    user.emailVerificationExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);
    await user.save();

    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      token: rawVerificationToken,
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Customer registered successfully. Please check your email to verify your account.",
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

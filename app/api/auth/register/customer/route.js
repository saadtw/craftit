import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { supabase, supabaseAdmin } from "@/lib/supabase";

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

    // 1. Create the user in Supabase using the anon client so it sends the verification email
    const { data: supaData, error: supaError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name,
          role: "customer",
        },
      },
    });

    if (supaError) {
      console.error("Supabase registration error:", supaError);
      return NextResponse.json(
        { success: false, message: supaError.message || "Registration failed" },
        { status: 400 },
      );
    }

    // 2. Create the profile in MongoDB (no password stored here)
    const user = await User.create({
      supabaseId: supaData.user.id,
      role: "customer",
      name,
      email: normalizedEmail,
      phone,
      location: location || {},
      isActive: true,
      isEmailVerified: false,
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Customer registered successfully. A verification email has been sent to your inbox.",
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

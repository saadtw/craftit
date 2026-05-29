import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import VerificationDocument from "@/models/VerificationDocument";
import { supabase, supabaseAdmin } from "@/lib/supabase";

// POST /api/auth/register/manufacturer — register a new manufacturer
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      name,
      email,
      password,
      phone,
      businessName,
      contactPerson,
      businessEmail,
      businessPhone,
      businessRegistrationNumber,
      businessAddress,
      businessDescription,
      manufacturingCapabilities,
      materialsAvailable,
      minOrderQuantity,
      productionCapacity,
      leadTimeDays,
      customizationCapabilities,
      budgetRange,
      location,
      certifications,
      documents,
    } = body;
    const normalizedEmail = email?.toLowerCase().trim();

    // Validation
    if (!name || !normalizedEmail || !password || !businessName) {
      return NextResponse.json(
        {
          success: false,
          message: "Name, email, password and business name are required",
        },
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
          role: "manufacturer",
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
      role: "manufacturer",
      name,
      email: normalizedEmail,
      phone,
      businessName,
      contactPerson: contactPerson || name,
      businessEmail: businessEmail || email,
      businessPhone: businessPhone || phone,
      businessRegistrationNumber,
      businessAddress,
      businessDescription,
      manufacturingCapabilities: manufacturingCapabilities || [],
      materialsAvailable: materialsAvailable || [],
      minOrderQuantity,
      productionCapacity,
      leadTimeDays,
      customizationCapabilities: customizationCapabilities || [],
      budgetRange,
      location,
      certifications: certifications || [],
      verificationStatus: "unverified",
      isActive: true,
      isEmailVerified: false,
    });

    // Create verification document if documents provided
    if (documents && documents.length > 0) {
      await VerificationDocument.create({
        manufacturerId: user._id,
        documents: documents.map((doc) => ({
          type: doc.type,
          url: doc.url,
          filename: doc.filename,
          fileSize: doc.fileSize,
        })),
        verificationStatus: "pending",
      });
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Manufacturer registered successfully. Please verify your email to continue.",
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          verificationStatus: user.verificationStatus,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Manufacturer registration error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

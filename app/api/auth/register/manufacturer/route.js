import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import VerificationDocument from "@/models/VerificationDocument";
import { createRawToken, hashToken } from "@/lib/token";
import { sendVerificationEmail } from "@/lib/email";

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
      role: "manufacturer",
      name,
      email: normalizedEmail,
      password,
      authMethod: "credentials",
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
      budgetRange,
      location,
      certifications: certifications || [],
      verificationStatus: "unverified",
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

// app/api/auth/register/manufacturer-google/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { resolveRequestSession } from "@/lib/requestAuth";

export async function POST(request) {
  try {
    const session = await resolveRequestSession(request);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const {
      phone,
      businessName,
      businessEmail,
      businessPhone,
      businessType,
      businessRegistrationNumber,
      businessDescription,
      manufacturingCapabilities,
      materialsAvailable,
      location,
    } = await request.json();

    if (!businessName || !businessPhone || !location?.city || !location?.state || !location?.country) {
      return NextResponse.json(
        { success: false, message: "Missing required business fields" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (user.role === "admin") {
      return NextResponse.json(
        { success: false, message: "Admins cannot register as manufacturers" },
        { status: 400 }
      );
    }

    // Update user profile to manufacturer
    user.role = "manufacturer";
    user.verificationStatus = "unverified"; // Must be verified by admin
    
    // Set fields
    if (phone) user.phone = phone;
    user.businessName = businessName;
    if (businessEmail) user.businessEmail = businessEmail;
    user.businessPhone = businessPhone;
    if (businessType) user.businessType = businessType;
    if (businessRegistrationNumber) user.businessRegistrationNumber = businessRegistrationNumber;
    if (businessDescription) user.businessDescription = businessDescription;
    
    if (manufacturingCapabilities) user.manufacturingCapabilities = manufacturingCapabilities;
    if (materialsAvailable) user.materialsAvailable = materialsAvailable;
    
    if (location) {
      user.location = {
        city: location.city,
        state: location.state,
        country: location.country,
      };
      // Map to businessAddress as well for compatibility
      user.businessAddress = {
        city: location.city,
        state: location.state,
        country: location.country,
      };
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Manufacturer profile completed successfully",
    });
  } catch (error) {
    console.error("Manufacturer Google Onboarding error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import VerificationDocument from "@/models/VerificationDocument";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (session?.error === "SESSION_INVALID") {
      return NextResponse.json(
        { success: false, message: "Session invalid" },
        { status: 401 },
      );
    }

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id).select("-password");

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: "Account is deactivated" },
        { status: 403 },
      );
    }

    if (user.isCurrentlySuspended && user.isCurrentlySuspended()) {
      return NextResponse.json(
        {
          success: false,
          message: "Account is suspended",
          suspendedUntil: user.suspendedUntil,
          suspensionReason: user.suspensionReason,
        },
        { status: 403 },
      );
    }

    // Update last active
    user
      .updateLastActive()
      .catch((err) => console.error("Failed to update last active:", err));

    let verificationDocuments = null;
    if (user.role === "manufacturer") {
      verificationDocuments = await VerificationDocument.findOne({
        manufacturerId: user._id,
      }).lean();
    }

    const userData = user.toObject();
    userData.verificationDocuments = verificationDocuments;

    return NextResponse.json({
      success: true,
      user: userData,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch user data" },
      { status: 500 },
    );
  }
}

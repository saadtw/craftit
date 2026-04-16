import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import VerificationDocument from "@/models/VerificationDocument";
import { resolveRequestSession } from "@/lib/requestAuth";

export async function GET(request) {
  try {
    const session = await resolveRequestSession(request);

    if (session?.error === "SESSION_INVALID") {
      return NextResponse.json(
        { success: false, message: "Session invalid" },
        { status: 401 },
      );
    }

    if (!session?.user?.id) {
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
    console.error("Mobile me error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch user data" },
      { status: 500 },
    );
  }
}

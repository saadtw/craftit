import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    await connectDB();
    const user = await User.findById(session.user.id).select(
      "twoFactorEnabled email",
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      twoFactorEnabled: !!user.twoFactorEnabled,
      email: user.email,
    });
  } catch (error) {
    console.error("2FA settings GET error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load 2FA settings" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { enabled } = await request.json();
    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { success: false, message: "enabled must be a boolean" },
        { status: 400 },
      );
    }

    await connectDB();
    const user = await User.findById(session.user.id).select(
      "twoFactorEnabled",
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    user.twoFactorEnabled = enabled;
    if (!enabled) {
      user.twoFactorCodeToken = undefined;
      user.twoFactorCodeExpires = undefined;
    }
    await user.save();

    return NextResponse.json({
      success: true,
      message: enabled ? "2FA enabled" : "2FA disabled",
      twoFactorEnabled: user.twoFactorEnabled,
    });
  } catch (error) {
    console.error("2FA settings POST error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to update 2FA settings" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST /api/auth/oauth/set-password
// Sets a real password for a Google OAuth customer who has requiresPasswordSetup = true.
// Body: { password: string }
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.requiresPasswordSetup) {
      return NextResponse.json(
        { error: "Password is already set for this account" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const password = String(body?.password || "").trim();

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    await connectDB();

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.findByIdAndUpdate(session.user.id, {
      password: hashedPassword,
      requiresPasswordSetup: false,
      $inc: { sessionVersion: 1 }, // invalidates existing sessions
    });

    return NextResponse.json({
      success: true,
      message: "Password set successfully. Please sign in again.",
    });
  } catch (error) {
    console.error("Set password error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

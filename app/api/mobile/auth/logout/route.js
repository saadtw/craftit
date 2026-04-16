import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { hashToken } from "@/lib/token";
import { resolveRequestSession } from "@/lib/requestAuth";

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const refreshToken = String(body?.refreshToken || "").trim();
    const logoutAllDevices = body?.logoutAllDevices === true;

    const session = await resolveRequestSession(request);

    if (!refreshToken && !session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "No active session to logout" },
        { status: 400 },
      );
    }

    let user = null;

    if (session?.user?.id) {
      user = await User.findById(session.user.id).select(
        "+mobileRefreshTokens",
      );
    }

    if (!user && refreshToken) {
      const tokenHash = hashToken(refreshToken);
      user = await User.findOne({
        "mobileRefreshTokens.tokenHash": tokenHash,
      }).select("+mobileRefreshTokens");
    }

    if (!user) {
      return NextResponse.json({ success: true, loggedOut: true });
    }

    if (logoutAllDevices) {
      user.mobileRefreshTokens = [];
      await user.save();
      return NextResponse.json({ success: true, loggedOut: true });
    }

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      user.mobileRefreshTokens = (user.mobileRefreshTokens || []).map(
        (token) => {
          if (token.tokenHash !== tokenHash || token.revokedAt) return token;
          return {
            ...(token.toObject ? token.toObject() : token),
            revokedAt: new Date(),
          };
        },
      );
      await user.save();
    }

    return NextResponse.json({ success: true, loggedOut: true });
  } catch (error) {
    console.error("Mobile logout error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to logout" },
      { status: 500 },
    );
  }
}

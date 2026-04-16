import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { hashToken } from "@/lib/token";
import {
  appendRefreshToken,
  buildAuthUser,
  createAccessToken,
  createRefreshTokenPayload,
  findRefreshToken,
  getAccessTokenExpirySeconds,
  revokeRefreshToken,
} from "@/lib/mobileAuth";

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const refreshToken = String(body?.refreshToken || "").trim();

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: "refreshToken is required" },
        { status: 400 },
      );
    }

    const refreshTokenHash = hashToken(refreshToken);

    const user = await User.findOne({
      "mobileRefreshTokens.tokenHash": {
        $eq: refreshTokenHash,
      },
    }).select(
      "+mobileRefreshTokens _id email name role verificationStatus businessName isEmailVerified twoFactorEnabled isActive suspendedAt suspendedUntil sessionVersion",
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid refresh token" },
        { status: 401 },
      );
    }

    const { tokenHash, token } = findRefreshToken(user, refreshToken);
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Invalid refresh token" },
        { status: 401 },
      );
    }

    if (
      !user.isActive ||
      (user.isCurrentlySuspended && user.isCurrentlySuspended())
    ) {
      revokeRefreshToken(user, tokenHash);
      await user.save();
      return NextResponse.json(
        { success: false, message: "Session invalid" },
        { status: 401 },
      );
    }

    revokeRefreshToken(user, tokenHash);

    const nextRefresh = createRefreshTokenPayload();
    appendRefreshToken(user, nextRefresh.tokenHash, nextRefresh.expiresAt, {
      deviceId: body?.deviceId || token.deviceId,
      deviceName: body?.deviceName || token.deviceName,
    });

    await user.save();

    const accessToken = createAccessToken(user);

    return NextResponse.json({
      success: true,
      user: buildAuthUser(user),
      tokens: {
        tokenType: "Bearer",
        accessToken,
        accessTokenExpiresIn: getAccessTokenExpirySeconds(),
        refreshToken: nextRefresh.refreshToken,
        refreshTokenExpiresAt: nextRefresh.expiresAt,
      },
    });
  } catch (error) {
    console.error("Mobile refresh error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to refresh session" },
      { status: 500 },
    );
  }
}

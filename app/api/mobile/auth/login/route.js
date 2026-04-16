import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import {
  appendRefreshToken,
  buildAuthUser,
  createAccessToken,
  createRefreshTokenPayload,
  getAccessTokenExpirySeconds,
} from "@/lib/mobileAuth";

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(body?.password || "");
    const twoFactorCode = String(body?.twoFactorCode || "").trim();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 },
      );
    }

    const user = await User.findOne({ email }).select(
      "+password +twoFactorCodeToken +twoFactorCodeExpires +mobileRefreshTokens",
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 },
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
        { success: false, message: "Account is suspended" },
        { status: 403 },
      );
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 },
      );
    }

    if (!user.isEmailVerified) {
      return NextResponse.json(
        {
          success: false,
          message: "Please verify your email before logging in",
        },
        { status: 403 },
      );
    }

    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return NextResponse.json(
          {
            success: false,
            message: "Two-factor authentication code is required",
            code: "TWO_FACTOR_REQUIRED",
          },
          { status: 401 },
        );
      }

      const { hashToken } = await import("@/lib/token");
      const hashedCode = hashToken(twoFactorCode);
      const isCodeValid =
        user.twoFactorCodeToken === hashedCode &&
        user.twoFactorCodeExpires &&
        user.twoFactorCodeExpires > new Date();

      if (!isCodeValid) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid or expired two-factor code",
            code: "INVALID_TWO_FACTOR_CODE",
          },
          { status: 401 },
        );
      }

      user.twoFactorCodeToken = undefined;
      user.twoFactorCodeExpires = undefined;
    }

    user.lastLogin = new Date();

    const { refreshToken, tokenHash, expiresAt } = createRefreshTokenPayload();
    appendRefreshToken(user, tokenHash, expiresAt, {
      deviceId: body?.deviceId,
      deviceName: body?.deviceName,
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
        refreshToken,
        refreshTokenExpiresAt: expiresAt,
      },
    });
  } catch (error) {
    console.error("Mobile login error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to login" },
      { status: 500 },
    );
  }
}

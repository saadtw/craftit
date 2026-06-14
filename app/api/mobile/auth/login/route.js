import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { supabaseAdmin } from "@/lib/supabase";
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

    const user = await User.findOne({ email }).select("+mobileRefreshTokens");

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

    // Create a fresh client so we don't mutate global server state
    const { createClient } = require("@supabase/supabase-js");
    const tempSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: false } }
    );

    const { data: supabaseData, error: signInError } =
      await tempSupabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      if (/email not confirmed/i.test(signInError.message || "")) {
        return NextResponse.json(
          {
            success: false,
            message: "Please verify your email before logging in",
            code: "EMAIL_NOT_VERIFIED",
          },
          { status: 403 },
        );
      }

      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 },
      );
    }

    if (!user.isEmailVerified && !supabaseData?.user?.email_confirmed_at) {
      return NextResponse.json(
        {
          success: false,
          message: "Please verify your email before logging in",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 403 },
      );
    }

    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        const { error: otpError } = await tempSupabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false },
        });

        if (otpError) {
          console.error("Mobile 2FA OTP send error:", otpError);
        }

        return NextResponse.json(
          {
            success: false,
            message: "Two-factor authentication code is required",
            code: "TWO_FACTOR_REQUIRED",
          },
          { status: 401 },
        );
      }

      const { error: otpVerifyError } = await tempSupabase.auth.verifyOtp({
        email,
        token: twoFactorCode,
        type: "magiclink",
      });

      if (otpVerifyError) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid or expired two-factor code",
            code: "INVALID_TWO_FACTOR_CODE",
          },
          { status: 401 },
        );
      }
    }

    if (!user.isEmailVerified && supabaseData?.user?.email_confirmed_at) {
      user.isEmailVerified = true;
      user.emailVerifiedAt = supabaseData.user.email_confirmed_at;
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

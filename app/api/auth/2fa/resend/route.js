// app/api/auth/2fa/resend/route.js
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: process.env.NEXTAUTH_URL || "http://localhost:3000",
      },
    });

    if (error) {
      console.error("2FA Resend error:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "2FA code sent successfully",
    });
  } catch (error) {
    console.error("2FA Resend internal error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

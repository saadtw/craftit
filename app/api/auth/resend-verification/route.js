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

    // Ask Supabase to resend the signup verification email
    const { error } = await supabaseAdmin.auth.resend({
      type: "signup",
      email: email.toLowerCase().trim(),
    });

    if (error) {
      console.error("Resend verification error:", error);
      // Don't reveal if the email exists or not
    }

    // Always return a vague success to avoid email enumeration
    return NextResponse.json({
      success: true,
      message:
        "If your account exists and is unverified, a new code has been sent.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to process request" },
      { status: 500 },
    );
  }
}

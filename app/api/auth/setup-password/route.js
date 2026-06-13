import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveRequestSession } from "@/lib/requestAuth";

async function findSupabaseUserByEmail(email) {
  const normalizedEmail = email?.toLowerCase().trim();
  if (!normalizedEmail) return null;

  let page = 1;
  const perPage = 100;

  while (page <= 10) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.error("Supabase user lookup error:", error);
      return null;
    }

    const users = data?.users || [];
    const match = users.find(
      (candidate) => candidate.email?.toLowerCase().trim() === normalizedEmail,
    );

    if (match) return match;
    if (users.length < perPage) return null;
    page += 1;
  }

  return null;
}

export async function POST(request) {
  try {
    const session = await resolveRequestSession(request);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, message: "Password is required" },
        { status: 400 },
      );
    }

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (password.length < 8 || !hasLower || !hasUpper || !hasNumber) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password must be at least 8 characters and include upper, lower, and number",
        },
        { status: 400 },
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id).select(
      "email supabaseId needsPasswordSetup",
    );
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    if (!user.needsPasswordSetup) {
      return NextResponse.json(
        {
          success: false,
          message: "Password setup is not required for this account",
        },
        { status: 400 },
      );
    }

    let lookupErr = null;

    if (user.supabaseId) {
      const { error } = await supabaseAdmin.auth.admin.getUserById(
        user.supabaseId,
      );
      lookupErr = error;
    }

    if (!user.supabaseId || lookupErr) {
      const supabaseUser = await findSupabaseUserByEmail(user.email);

      if (!supabaseUser) {
        console.error("Supabase user lookup failed:", lookupErr);
        return NextResponse.json(
          {
            success: false,
            message:
              "Password setup failed because the linked auth account was not found",
          },
          { status: 404 },
        );
      }

      user.supabaseId = supabaseUser.id;
    }

    // Update password in Supabase
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      user.supabaseId,
      { password: password },
    );

    if (updateErr) {
      console.error("Supabase password update error:", updateErr);
      return NextResponse.json(
        { success: false, message: "Password setup failed" },
        { status: 500 },
      );
    }

    // Update MongoDB
    user.needsPasswordSetup = false;
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Password set successfully",
    });
  } catch (error) {
    console.error("Setup password error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Password setup failed" },
      { status: 500 },
    );
  }
}

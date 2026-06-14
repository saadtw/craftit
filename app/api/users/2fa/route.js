// app/api/users/2fa/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { resolveRequestSession } from "@/lib/requestAuth";
import { supabaseAdmin } from "@/lib/supabase";

// GET - check 2FA status
export async function GET(request) {
  try {
    const session = await resolveRequestSession(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const user = await User.findById(session.user.id).select("twoFactorEnabled").lean();
    
    return NextResponse.json({ success: true, twoFactorEnabled: !!user?.twoFactorEnabled });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Enable 2FA
export async function POST(request) {
  try {
    const session = await resolveRequestSession(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: "Password is required to enable 2FA" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user || !user.email) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create a fresh client so we don't mutate global server state
    const { createClient } = require("@supabase/supabase-js");
    const tempSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: false } }
    );

    // Verify password against Supabase
    const { data: authData, error: authError } = await tempSupabase.auth.signInWithPassword({
      email: user.email,
      password: password,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    user.twoFactorEnabled = true;
    await user.save();

    return NextResponse.json({ success: true, message: "2FA enabled successfully" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Disable 2FA
export async function DELETE(request) {
  try {
    const session = await resolveRequestSession(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: "Password is required to disable 2FA" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user || !user.email) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create a fresh client so we don't mutate global server state
    const { createClient } = require("@supabase/supabase-js");
    const tempSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: false } }
    );

    // Verify password against Supabase
    const { data: authData, error: authError } = await tempSupabase.auth.signInWithPassword({
      email: user.email,
      password: password,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    user.twoFactorEnabled = false;
    await user.save();

    return NextResponse.json({ success: true, message: "2FA disabled successfully" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

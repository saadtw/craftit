// for testing purpose only
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.toLowerCase().trim();

    if (!email) {
      return NextResponse.json(
        { error: "Please provide an email like ?email=test@test.com" },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. Delete from MongoDB
    const mongoResult = await User.deleteOne({ email });

    // 2. Delete from Supabase
    // Note: Supabase doesn't have a direct deleteByEmail, so we list and match
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }

    const supaUser = users.find((u) => u.email === email);
    let supaDeleted = false;

    if (supaUser) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(supaUser.id);
      if (deleteError) throw deleteError;
      supaDeleted = true;
    }

    return NextResponse.json({
      success: true,
      message: `Account wiping completed for ${email}`,
      results: {
        deletedFromMongoDB: mongoResult.deletedCount > 0,
        deletedFromSupabase: supaDeleted,
      }
    });
  } catch (error) {
    console.error("Force delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

//http://localhost:3000/api/force-delete?email=fasihatariq456@gmail.com
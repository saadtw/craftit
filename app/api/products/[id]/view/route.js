import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";

// POST /api/products/[id]/view
// Silently increments view count. No auth required.

export async function POST(request, context) {
  const { id } = await context.params;

  try {
    await connectDB();
    await Product.findByIdAndUpdate(id, { $inc: { views: 1 } });
    return NextResponse.json({ success: true });
  } catch (error) {
    // Fail silently — this is a fire-and-forget call
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

// app/api/admin/manufacturers/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import VerificationDocument from "@/models/VerificationDocument";

// GET - List manufacturers pending verification
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 401 },
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "unverified";
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;

    const query = {
      role: "manufacturer",
      verificationStatus: status,
    };

    const manufacturers = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get verification documents for each manufacturer
    const manufacturersWithDocs = await Promise.all(
      manufacturers.map(async (manufacturer) => {
        const docs = await VerificationDocument.findOne({
          manufacturerId: manufacturer._id,
        });
        return {
          ...manufacturer,
          verificationDocuments: docs,
        };
      }),
    );

    const total = await User.countDocuments(query);

    return NextResponse.json({
      success: true,
      manufacturers: manufacturersWithDocs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin manufacturers list error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

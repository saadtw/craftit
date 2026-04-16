import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import AdminLog from "@/models/AdminLog";
import { resolveRequestSession } from "@/lib/requestAuth";

// GET /api/admin/activity-log  — list admin activity logs with filters
export async function GET(request) {
  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const action = searchParams.get("action");
    const skip = (page - 1) * limit;
    const query = {};

    if (action) {
      query.action = action;
    }

    const [logs, total] = await Promise.all([
      AdminLog.find(query)
        .populate("adminId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AdminLog.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      logs,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/admin/activity-log  — internal use (called from other admin routes)
export async function POST(request) {
  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const log = await AdminLog.create({
      adminId: session.user.id,
      ...body,
    });

    return NextResponse.json({ success: true, log }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

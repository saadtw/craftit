// app/api/admin/stats/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Order from "@/models/Order";
import Dispute from "@/models/Dispute";

// GET /api/admin/stats — get overall platform statistics
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const [
      totalCustomers,
      totalManufacturers,
      pendingVerifications,
      activeOrders,
      activeDisputes,
    ] = await Promise.all([
      User.countDocuments({ role: "customer", isActive: true }),
      User.countDocuments({ role: "manufacturer" }),
      User.countDocuments({
        role: "manufacturer",
        verificationStatus: "unverified",
      }),
      Order.countDocuments({
        status: {
          $in: ["pending_acceptance", "accepted", "in_production", "shipped"],
        },
      }),
      Dispute.countDocuments({
        status: { $in: ["open", "manufacturer_responded", "under_review"] },
      }),
    ]);

    return NextResponse.json({
      success: true,
      totalCustomers,
      totalManufacturers,
      totalUsers: totalCustomers + totalManufacturers,
      pendingVerifications,
      activeOrders,
      activeDisputes,
    });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

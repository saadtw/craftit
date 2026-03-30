import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Order from "@/models/Order";
import AdminLog from "@/models/AdminLog";
import { publishSessionEvent } from "@/lib/sessionEmitter";

// GET /api/admin/users/[id] — get user details and recent orders
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const user = await User.findById(id).select("-password").lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get order stats
    const orderQuery =
      user.role === "customer" ? { customerId: id } : { manufacturerId: id };

    const [orders, orderCount] = await Promise.all([
      Order.find(orderQuery)
        .select("orderNumber status totalPrice createdAt orderType")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Order.countDocuments(orderQuery),
    ]);

    return NextResponse.json({
      success: true,
      user,
      orders,
      recentOrders: orders,
      orderCount,
    });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH /api/admin/users/[id]  — suspend or unsuspend
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const { action, reason, detail, duration } = await request.json();
    // duration: "7" | "30" | "permanent"

    const user = await User.findById(id);
    if (!user || user.role === "admin") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "suspend") {
      if (!reason) {
        return NextResponse.json(
          { error: "reason is required" },
          { status: 400 },
        );
      }
      user.isActive = false;
      user.suspendedAt = new Date();
      user.suspendedBy = session.user.id;
      user.suspensionReason = detail || reason;

      if (duration === "7") {
        user.suspendedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      } else if (duration === "30") {
        user.suspendedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      } else {
        // permanent
        user.suspendedUntil = null;
      }

      // Revoke all active sessions for immediate logout.
      user.sessionVersion = (user.sessionVersion || 0) + 1;
    } else if (action === "unsuspend") {
      user.isActive = true;
      user.suspendedAt = undefined;
      user.suspendedUntil = undefined;
      user.suspensionReason = undefined;
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await user.save();

    if (action === "suspend") {
      publishSessionEvent(user._id.toString(), {
        type: "SESSION_INVALIDATED",
        reason: "suspended",
      });
    }

    await AdminLog.create({
      adminId: session.user.id,
      action: action === "suspend" ? "user_suspended" : "user_unsuspended",
      targetType: "user",
      targetId: user._id,
      description:
        action === "suspend"
          ? `Suspended ${user.role} ${user.name || user.businessName} (${duration || "permanent"})${reason ? `: ${reason}` : ""}`
          : `Unsuspended ${user.role} ${user.name || user.businessName}`,
      details: detail || reason,
    });

    return NextResponse.json({ success: true, user, action });
  } catch (error) {
    console.error("PATCH /api/admin/users/[id] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

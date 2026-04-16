import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";
import SupportTicketMessage from "@/models/SupportTicketMessage";
import User from "@/models/User";
import { createNotification } from "@/services/notificationService";
import { resolveRequestSession } from "@/lib/requestAuth";

const STATUSES = new Set([
  "open",
  "in_progress",
  "waiting_for_user",
  "resolved",
  "closed",
]);

const CATEGORIES = new Set([
  "order",
  "payment",
  "product",
  "account",
  "technical",
  "other",
]);

// GET /api/support-tickets
export async function GET(request) {
  try {
    const session = await resolveRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["customer", "manufacturer", "admin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10), 1),
      50,
    );
    const skip = (page - 1) * limit;

    const status = String(searchParams.get("status") || "all").trim();
    const category = String(searchParams.get("category") || "all").trim();
    const assigned = String(searchParams.get("assigned") || "all").trim();
    const q = String(searchParams.get("q") || "").trim();

    const query = {};

    if (session.user.role !== "admin") {
      query.requesterId = session.user.id;
    }

    if (status !== "all" && STATUSES.has(status)) {
      query.status = status;
    }

    if (category !== "all" && CATEGORIES.has(category)) {
      query.category = category;
    }

    if (session.user.role === "admin") {
      if (assigned === "me") {
        query.assignedAdminId = session.user.id;
      }
      if (assigned === "unassigned") {
        query.assignedAdminId = { $exists: false };
      }
    }

    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ ticketNumber: regex }, { subject: regex }];
    }

    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .populate("requesterId", "name businessName email role")
        .populate("assignedAdminId", "name email")
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SupportTicket.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      tickets: tickets.map((ticket) => ({
        ...ticket,
        unreadCount:
          session.user.role === "admin"
            ? ticket.adminUnreadCount || 0
            : ticket.requesterUnreadCount || 0,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    console.error("Support tickets GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/support-tickets
// Body: { subject, message, category?, priority?, relatedType?, relatedId? }
export async function POST(request) {
  try {
    const session = await resolveRequestSession(request);
    if (!session || !["customer", "manufacturer"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    const subject = String(body?.subject || "").trim();
    const message = String(body?.message || "").trim();
    const category = CATEGORIES.has(String(body?.category || ""))
      ? String(body.category)
      : "other";
    const priority = ["low", "medium", "high"].includes(body?.priority)
      ? body.priority
      : "medium";

    if (subject.length < 3 || message.length < 5) {
      return NextResponse.json(
        { error: "Subject and message are required" },
        { status: 400 },
      );
    }

    const requesterName =
      session.user.businessName || session.user.name || "Requester";

    const ticket = await SupportTicket.create({
      requesterId: session.user.id,
      requesterRole: session.user.role,
      subject,
      category,
      priority,
      relatedType: body?.relatedType || "other",
      relatedId: body?.relatedId || undefined,
      lastMessagePreview: message.slice(0, 300),
      lastMessageAt: new Date(),
      adminUnreadCount: 1,
    });

    await SupportTicketMessage.create({
      ticketId: ticket._id,
      senderId: session.user.id,
      senderRole: session.user.role,
      senderName: requesterName,
      message,
    });

    const admins = await User.find({ role: "admin", isActive: true })
      .select("_id")
      .limit(20)
      .lean();

    await Promise.allSettled(
      admins.map((admin) =>
        createNotification({
          userId: admin._id,
          type: "support_ticket_created",
          title: "New support ticket",
          message: `${requesterName} created ticket ${ticket.ticketNumber}.`,
          link: `/admin/support/${ticket._id}`,
          relatedType: "support_ticket",
          relatedId: ticket._id,
        }),
      ),
    );

    const created = await SupportTicket.findById(ticket._id)
      .populate("requesterId", "name businessName email role")
      .lean();

    return NextResponse.json(
      { success: true, ticket: created },
      { status: 201 },
    );
  } catch (error) {
    console.error("Support tickets POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

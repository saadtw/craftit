import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";
import SupportTicketMessage from "@/models/SupportTicketMessage";
import AdminLog from "@/models/AdminLog";
import { createNotification } from "@/services/notificationService";

function hasAccess(ticket, session) {
  if (session.user.role === "admin") return true;
  const requesterId =
    ticket?.requesterId && typeof ticket.requesterId === "object"
      ? (ticket.requesterId._id || ticket.requesterId.id || "").toString()
      : (ticket?.requesterId || "").toString();

  return requesterId === String(session.user.id);
}

// GET /api/support-tickets/[id]
export async function GET(request, context) {
  const { id } = await context.params;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const ticket = await SupportTicket.findById(id)
      .populate("requesterId", "name businessName email role")
      .populate("assignedAdminId", "name email");

    if (!ticket) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!hasAccess(ticket, session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await SupportTicketMessage.find({ ticketId: ticket._id })
      .sort({ createdAt: 1 })
      .limit(300)
      .lean();

    if (session.user.role === "admin" && ticket.adminUnreadCount > 0) {
      ticket.adminUnreadCount = 0;
      await ticket.save();
    }

    if (session.user.role !== "admin" && ticket.requesterUnreadCount > 0) {
      ticket.requesterUnreadCount = 0;
      await ticket.save();
    }

    return NextResponse.json({
      success: true,
      ticket,
      messages,
    });
  } catch (error) {
    console.error("Support ticket GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH /api/support-tickets/[id]
// Admin updates: { action: "update", status?, priority?, assignedAdminId? }
// Requester close: { action: "close" }
export async function PATCH(request, context) {
  const { id } = await context.params;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();

    if (session.user.role === "admin" && body.action === "update") {
      const oldStatus = ticket.status;

      if (
        [
          "open",
          "in_progress",
          "waiting_for_user",
          "resolved",
          "closed",
        ].includes(body.status)
      ) {
        ticket.status = body.status;
      }

      if (["low", "medium", "high"].includes(body.priority)) {
        ticket.priority = body.priority;
      }

      if (body.assignedAdminId) {
        ticket.assignedAdminId = body.assignedAdminId;
      }

      if (ticket.status === "resolved" && !ticket.resolvedAt) {
        ticket.resolvedAt = new Date();
      }

      if (ticket.status === "closed" && !ticket.closedAt) {
        ticket.closedAt = new Date();
      }

      await ticket.save();

      await AdminLog.create({
        adminId: session.user.id,
        action: "support_ticket_updated",
        targetType: "support_ticket",
        targetId: ticket._id,
        description: `Updated support ticket ${ticket.ticketNumber}`,
        details: `Status: ${oldStatus} -> ${ticket.status}`,
      });

      await createNotification({
        userId: ticket.requesterId,
        type: "support_ticket_updated",
        title: "Support ticket updated",
        message: `Ticket ${ticket.ticketNumber} is now ${ticket.status.replace(/_/g, " ")}.`,
        link:
          ticket.requesterRole === "customer"
            ? `/customer/support/${ticket._id}`
            : `/manufacturer/support/${ticket._id}`,
        relatedType: "support_ticket",
        relatedId: ticket._id,
      });

      return NextResponse.json({ success: true, ticket });
    }

    if (
      body.action === "close" &&
      session.user.role !== "admin" &&
      ticket.requesterId.toString() === session.user.id
    ) {
      ticket.status = "closed";
      ticket.closedAt = new Date();
      await ticket.save();

      return NextResponse.json({ success: true, ticket });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error) {
    console.error("Support ticket PATCH error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

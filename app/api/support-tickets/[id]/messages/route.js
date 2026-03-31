import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";
import SupportTicketMessage from "@/models/SupportTicketMessage";
import User from "@/models/User";
import { createNotification } from "@/services/notificationService";

function canAccess(ticket, session) {
  if (session.user.role === "admin") return true;
  return ticket.requesterId.toString() === session.user.id;
}

// POST /api/support-tickets/[id]/messages
export async function POST(request, context) {
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

    if (!canAccess(ticket, session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (ticket.status === "closed") {
      return NextResponse.json({ error: "Ticket is closed" }, { status: 400 });
    }

    const body = await request.json();
    const text = String(body?.message || "").trim();

    if (text.length < 1) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    const senderName =
      session.user.businessName || session.user.name || session.user.email;

    const newMessage = await SupportTicketMessage.create({
      ticketId: ticket._id,
      senderId: session.user.id,
      senderRole: session.user.role,
      senderName,
      message: text,
    });

    ticket.lastMessagePreview = text.slice(0, 300);
    ticket.lastMessageAt = newMessage.createdAt;

    if (session.user.role === "admin") {
      ticket.requesterUnreadCount = (ticket.requesterUnreadCount || 0) + 1;
      ticket.status =
        ticket.status === "resolved" || ticket.status === "closed"
          ? "in_progress"
          : ticket.status;

      await createNotification({
        userId: ticket.requesterId,
        type: "support_ticket_replied",
        title: "Support replied",
        message: `There is a new reply on ${ticket.ticketNumber}.`,
        link:
          ticket.requesterRole === "customer"
            ? `/customer/support/${ticket._id}`
            : `/manufacturer/support/${ticket._id}`,
        relatedType: "support_ticket",
        relatedId: ticket._id,
      });
    } else {
      ticket.adminUnreadCount = (ticket.adminUnreadCount || 0) + 1;
      if (["waiting_for_user", "resolved"].includes(ticket.status)) {
        ticket.status = "in_progress";
      }

      const admins = await User.find({ role: "admin", isActive: true })
        .select("_id")
        .limit(20)
        .lean();

      await Promise.allSettled(
        admins.map((admin) =>
          createNotification({
            userId: admin._id,
            type: "support_ticket_replied",
            title: "Support ticket reply",
            message: `New customer reply on ${ticket.ticketNumber}.`,
            link: `/admin/support/${ticket._id}`,
            relatedType: "support_ticket",
            relatedId: ticket._id,
          }),
        ),
      );
    }

    await ticket.save();

    return NextResponse.json(
      { success: true, message: newMessage },
      { status: 201 },
    );
  } catch (error) {
    console.error("Support message POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

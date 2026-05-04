import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Dispute from "@/models/Dispute";
import "@/models/User";
import Conversation from "@/models/Chat";
import ChatMessage from "@/models/ChatMessage";
import { publish } from "@/lib/chatEmitter";
import { resolveRequestSession } from "@/lib/requestAuth";
import { notify } from "@/services/notificationService";

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Find-or-create the Conversation document for this dispute.
 * Participants are [customerId, manufacturerId].
 */
async function getOrCreateConversation(dispute) {
  let conversation = await Conversation.findOne({
    contextType: "dispute",
    contextId: dispute._id,
  });

  if (!conversation) {
    const customerId = dispute.customerId._id || dispute.customerId;
    const manufacturerId = dispute.manufacturerId._id || dispute.manufacturerId;

    conversation = await Conversation.create({
      participants: [customerId, manufacturerId],
      contextType: "dispute",
      contextId: dispute._id,
      unreadCounts: {
        [customerId.toString()]: 0,
        [manufacturerId.toString()]: 0,
      },
    });
  }

  return conversation;
}

/**
 * Verify the requesting user is a participant of this dispute or an admin.
 */
function assertParticipant(session, dispute) {
  const uid = session.user.id;
  const role = session.user.role;

  if (role === "admin") return true;

  const isCustomer =
    role === "customer" && dispute.customerId._id?.toString() === uid;
  const isManufacturer =
    role === "manufacturer" && dispute.manufacturerId._id?.toString() === uid;

  return isCustomer || isManufacturer;
}

async function markIncomingMessagesAsRead({
  conversationId,
  viewerId,
  roomId,
}) {
  const unreadIncoming = await ChatMessage.find({
    conversationId,
    senderId: { $ne: viewerId },
    "readBy.userId": { $ne: viewerId },
  })
    .select("_id")
    .limit(500)
    .lean();

  if (!unreadIncoming.length) return [];

  const messageIds = unreadIncoming.map((m) => m._id);
  const readEntry = {
    userId: viewerId,
    readAt: new Date(),
  };

  await ChatMessage.updateMany(
    { _id: { $in: messageIds } },
    { $push: { readBy: readEntry } },
  );

  publish(roomId, {
    type: "read_receipt",
    readerId: viewerId,
    messageIds: messageIds.map((id) => id.toString()),
    readAt: readEntry.readAt.toISOString(),
  });

  return messageIds;
}

// ─── GET /api/disputes/[id]/messages ──────────────────────────────────────────
// Returns the conversation + all messages. Resets unread count for caller.

export async function GET(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const dispute = await Dispute.findById(id)
      .populate("customerId", "_id name email")
      .populate("manufacturerId", "_id name businessName email")
      .lean();

    if (!dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    if (!assertParticipant(session, dispute)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const conversation = await getOrCreateConversation(dispute);

    await markIncomingMessagesAsRead({
      conversationId: conversation._id,
      viewerId: session.user.id,
      roomId: `dispute_${id}`, // Ensure unique room namespace for SSE
    });

    const messages = await ChatMessage.find({
      conversationId: conversation._id,
    })
      .sort({ createdAt: 1 })
      .lean();

    const uid = session.user.id;
    if (conversation.unreadCounts?.get?.(uid) > 0) {
      conversation.unreadCounts.set(uid, 0);
      await conversation.save();
    }

    return NextResponse.json({
      success: true,
      conversationId: conversation._id,
      participants: {
        customer: dispute.customerId,
        manufacturer: dispute.manufacturerId,
      },
      messages,
    });
  } catch (error) {
    console.error("Dispute messages GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST /api/disputes/[id]/messages ─────────────────────────────────────────
// Send a new message. Body: { message: string }

export async function POST(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 },
      );
    }

    if (message.trim().length > 2000) {
      return NextResponse.json(
        { error: "Message too long (max 2000 characters)" },
        { status: 400 },
      );
    }

    const dispute = await Dispute.findById(id)
      .populate("customerId", "_id name email")
      .populate("manufacturerId", "_id name businessName email");

    if (!dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    if (!assertParticipant(session, dispute)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (["resolved", "closed"].includes(dispute.status)) {
      return NextResponse.json(
        { error: "Cannot send messages in a resolved or closed dispute." },
        { status: 400 },
      );
    }

    const conversation = await getOrCreateConversation(dispute);

    let senderName;
    if (session.user.role === "admin") {
      senderName = "Admin";
    } else if (session.user.role === "manufacturer") {
      senderName = session.user.businessName || session.user.name;
    } else {
      senderName = session.user.name;
    }

    const newMessage = await ChatMessage.create({
      conversationId: conversation._id,
      senderId: session.user.id,
      senderRole: session.user.role,
      senderName,
      message: message.trim(),
      readBy: [{ userId: session.user.id, readAt: new Date() }],
    });

    conversation.lastMessage = {
      text: message.trim().slice(0, 100),
      senderId: session.user.id,
      sentAt: newMessage.createdAt,
    };

    // Increment unread counts for all participants except sender
    for (const pId of conversation.participants) {
      const pIdStr = pId.toString();
      if (pIdStr !== session.user.id) {
        const currentUnread = conversation.unreadCounts?.get?.(pIdStr) || 0;
        conversation.unreadCounts.set(pIdStr, currentUnread + 1);
      }
    }

    await conversation.save();

    publish(`dispute_${id}`, { type: "message", message: newMessage.toObject() });

    // Note: Can add notification dispatch here if needed for new dispute messages

    return NextResponse.json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error("Dispute messages POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

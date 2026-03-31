import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import "@/models/User";
import Conversation from "@/models/Chat";
import ChatMessage from "@/models/ChatMessage";
import { publish } from "@/lib/chatEmitter";

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Find-or-create the Conversation document for this order.
 * Participants are always [customerId, manufacturerId] derived from the order.
 */
async function getOrCreateConversation(order) {
  let conversation = await Conversation.findOne({
    contextType: "order",
    contextId: order._id,
  });

  if (!conversation) {
    // Support both lean (plain object with ._id) and Mongoose doc (populated)
    const customerId = order.customerId._id || order.customerId;
    const manufacturerId = order.manufacturerId._id || order.manufacturerId;

    conversation = await Conversation.create({
      participants: [customerId, manufacturerId],
      contextType: "order",
      contextId: order._id,
      unreadCounts: {
        [customerId.toString()]: 0,
        [manufacturerId.toString()]: 0,
      },
    });
  }

  return conversation;
}

/**
 * Verify the requesting user is a participant of this order.
 */
function assertParticipant(session, order) {
  const uid = session.user.id;
  const role = session.user.role;

  if (role === "admin") return true;

  const isCustomer =
    role === "customer" && order.customerId._id?.toString() === uid;
  const isManufacturer =
    role === "manufacturer" && order.manufacturerId._id?.toString() === uid;

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

// ─── GET /api/chat/[orderId] ───────────────────────────────────────────────────
// Returns the conversation + all messages. Also resets unread count for caller.

export async function GET(request, context) {
  const { orderId } = await context.params;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Load order to verify access and get participants
    const order = await Order.findById(orderId)
      .populate("customerId", "_id name email")
      .populate("manufacturerId", "_id name businessName email")
      .lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!assertParticipant(session, order)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get or create conversation
    const conversation = await getOrCreateConversation(order);

    await markIncomingMessagesAsRead({
      conversationId: conversation._id,
      viewerId: session.user.id,
      roomId: orderId,
    });

    // Fetch all messages (chronological)
    const messages = await ChatMessage.find({
      conversationId: conversation._id,
    })
      .sort({ createdAt: 1 })
      .lean();

    // Reset unread count for the requesting user
    const uid = session.user.id;
    if (conversation.unreadCounts?.get?.(uid) > 0) {
      conversation.unreadCounts.set(uid, 0);
      await conversation.save();
    }

    return NextResponse.json({
      success: true,
      conversationId: conversation._id,
      participants: {
        customer: order.customerId,
        manufacturer: order.manufacturerId,
      },
      messages,
    });
  } catch (error) {
    console.error("Chat GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST /api/chat/[orderId] ──────────────────────────────────────────────────
// Send a new message. Body: { message: string }

export async function POST(request, context) {
  const { orderId } = await context.params;

  try {
    const session = await getServerSession(authOptions);
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

    // Load order for access check + participant list
    const order = await Order.findById(orderId)
      .populate("customerId", "_id name email")
      .populate("manufacturerId", "_id name businessName email");

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!assertParticipant(session, order)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get or create conversation
    const conversation = await getOrCreateConversation(order);

    // Determine sender display name
    const senderName =
      session.user.role === "manufacturer"
        ? session.user.businessName || session.user.name
        : session.user.name;

    // Create the message
    const newMessage = await ChatMessage.create({
      conversationId: conversation._id,
      senderId: session.user.id,
      senderRole: session.user.role,
      senderName,
      message: message.trim(),
      readBy: [{ userId: session.user.id, readAt: new Date() }],
    });

    // Update conversation: last message snapshot + increment other participant's unread
    const otherParticipantId =
      session.user.role === "customer"
        ? order.manufacturerId._id.toString()
        : order.customerId._id.toString();

    const currentUnread =
      conversation.unreadCounts?.get?.(otherParticipantId) || 0;

    conversation.lastMessage = {
      text: message.trim().slice(0, 100),
      senderId: session.user.id,
      sentAt: newMessage.createdAt,
    };
    conversation.unreadCounts.set(otherParticipantId, currentUnread + 1);
    await conversation.save();

    // Push the new message to all connected SSE clients in this order's room.
    // toObject() converts the Mongoose doc to a plain object (serialisable).
    publish(orderId, { type: "message", message: newMessage.toObject() });

    return NextResponse.json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error("Chat POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

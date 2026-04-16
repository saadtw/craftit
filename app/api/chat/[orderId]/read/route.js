import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import "@/models/User";
import Conversation from "@/models/Chat";
import ChatMessage from "@/models/ChatMessage";
import { publish } from "@/lib/chatEmitter";
import { resolveRequestSession } from "@/lib/requestAuth";

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

// PATCH /api/chat/[orderId]/read
// Body: { messageIds?: string[] }
export async function PATCH(request, context) {
  const { orderId } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const order = await Order.findById(orderId)
      .populate("customerId", "_id")
      .populate("manufacturerId", "_id")
      .lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!assertParticipant(session, order)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const conversation = await Conversation.findOne({
      contextType: "order",
      contextId: order._id,
    });

    if (!conversation) {
      return NextResponse.json({
        success: true,
        readCount: 0,
        messageIds: [],
      });
    }

    const body = await request.json().catch(() => ({}));
    const requestedMessageIds = Array.isArray(body?.messageIds)
      ? body.messageIds
          .filter((id) => typeof id === "string" && id.trim())
          .slice(0, 200)
      : [];

    const query = {
      conversationId: conversation._id,
      senderId: { $ne: session.user.id },
      "readBy.userId": { $ne: session.user.id },
    };

    if (requestedMessageIds.length) {
      query._id = { $in: requestedMessageIds };
    }

    const unreadMessages = await ChatMessage.find(query)
      .select("_id")
      .limit(500)
      .lean();

    if (!unreadMessages.length) {
      if (conversation.unreadCounts?.get?.(session.user.id) > 0) {
        conversation.unreadCounts.set(session.user.id, 0);
        await conversation.save();
      }

      return NextResponse.json({
        success: true,
        readCount: 0,
        messageIds: [],
      });
    }

    const ids = unreadMessages.map((m) => m._id);
    const readEntry = {
      userId: session.user.id,
      readAt: new Date(),
    };

    await ChatMessage.updateMany(
      { _id: { $in: ids } },
      { $push: { readBy: readEntry } },
    );

    if (conversation.unreadCounts?.get?.(session.user.id) > 0) {
      conversation.unreadCounts.set(session.user.id, 0);
      await conversation.save();
    }

    publish(orderId, {
      type: "read_receipt",
      readerId: session.user.id,
      messageIds: ids.map((id) => id.toString()),
      readAt: readEntry.readAt.toISOString(),
    });

    return NextResponse.json({
      success: true,
      readCount: ids.length,
      messageIds: ids.map((id) => id.toString()),
    });
  } catch (error) {
    console.error("Chat read PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

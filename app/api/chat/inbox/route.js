import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Conversation from "@/models/Chat";
import Order from "@/models/Order";
import "@/models/User";
import { resolveRequestSession } from "@/lib/requestAuth";

const MAX_LIMIT = 50;
const MAX_SCAN = 500;

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getUnreadCount(unreadCounts, userId) {
  if (!unreadCounts || !userId) return 0;
  if (typeof unreadCounts.get === "function") {
    return Number(unreadCounts.get(userId) || 0);
  }
  return Number(unreadCounts[userId] || 0);
}

// GET /api/chat/inbox
// Query:
// - q: string
// - status: order status or "all"
// - unread: "true" | "false"
// - sort: "latest" | "oldest" | "unread"
// - page, limit
export async function GET(request) {
  try {
    const session = await resolveRequestSession(request);
    if (session?.error === "SESSION_INVALID") {
      return NextResponse.json({ error: "Session invalid" }, { status: 401 });
    }

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["customer", "manufacturer", "admin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const q = normalizeText(searchParams.get("q"));
    const status = normalizeText(searchParams.get("status") || "all");
    const unreadOnly = searchParams.get("unread") === "true";
    const sort = normalizeText(searchParams.get("sort") || "latest");

    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10), 1),
      MAX_LIMIT,
    );

    const baseQuery = {
      participants: session.user.id,
      contextType: { $in: ["order", "bid"] },
      isActive: true,
    };

    if (unreadOnly) {
      baseQuery[`unreadCounts.${session.user.id}`] = { $gt: 0 };
    }

    const conversations = await Conversation.find(baseQuery)
      .select(
        "contextId lastMessage unreadCounts updatedAt participants contextType",
      )
      .sort({ "lastMessage.sentAt": -1, updatedAt: -1 })
      .limit(MAX_SCAN)
      .lean();

    const orderIds = conversations
      .filter((c) => c.contextType === "order")
      .map((c) => c.contextId)
      .filter(Boolean);

    const bidIds = conversations
      .filter((c) => c.contextType === "bid")
      .map((c) => c.contextId)
      .filter(Boolean);

    const [orders, bids] = await Promise.all([
      Order.find({ _id: { $in: orderIds } })
        .select(
          "orderNumber status productDetails customerId manufacturerId createdAt updatedAt",
        )
        .populate("customerId", "name")
        .populate("manufacturerId", "name businessName")
        .lean(),
      (async () => {
        const Bid = (await import("@/models/Bid")).default;
        return Bid.find({ _id: { $in: bidIds } })
          .populate("rfqId", "rfqNumber customerId customOrderId")
          .populate("manufacturerId", "name businessName")
          .lean();
      })(),
    ]);

    const orderById = new Map(orders.map((o) => [o._id.toString(), o]));
    const bidById = new Map(bids.map((b) => [b._id.toString(), b]));

    // We need to populate customOrderId for bids to get product names
    const customOrderIds = bids
      .map((b) => b.rfqId?.customOrderId)
      .filter(Boolean);
    const CustomOrder = (await import("@/models/CustomOrder")).default;
    const customOrders = await CustomOrder.find({
      _id: { $in: customOrderIds },
    })
      .select("title")
      .lean();
    const customOrderById = new Map(
      customOrders.map((co) => [co._id.toString(), co]),
    );

    let threads = conversations
      .map((conversation) => {
        let threadInfo = null;

        if (conversation.contextType === "order") {
          const order = orderById.get(String(conversation.contextId));
          if (!order) return null;

          const counterpart =
            session.user.role === "customer"
              ? order.manufacturerId
              : order.customerId;

          threadInfo = {
            conversationId: conversation._id,
            contextType: "order",
            orderId: order._id,
            orderNumber: order.orderNumber,
            orderStatus: order.status,
            productName: order.productDetails?.name || "Custom Order",
            counterpart: {
              id: counterpart?._id,
              name: counterpart?.businessName || counterpart?.name || "User",
            },
          };
        } else if (conversation.contextType === "bid") {
          const bid = bidById.get(String(conversation.contextId));
          if (!bid) return null;

          const customerId = bid.rfqId?.customerId;
          const manufacturerId = bid.manufacturerId;

          const counterpart =
            session.user.role === "customer" ? manufacturerId : customerId;

          // For bid context, we get the product name from the associated CustomOrder
          const co = customOrderById.get(String(bid.rfqId?.customOrderId));

          threadInfo = {
            conversationId: conversation._id,
            contextType: "bid",
            orderId: bid._id, // Using as reference for UI linking
            orderNumber: bid.rfqId?.rfqNumber || "BID",
            orderStatus: bid.status === "under_consideration" ? "pending" : bid.status,
            productName: co?.title || "RFQ Proposal",
            counterpart: {
              id: counterpart?._id || counterpart,
              // Note: Counterpart might not be fully populated if it's just an ID
              name: counterpart?.businessName || counterpart?.name || "Customer",
            },
          };
        }

        if (!threadInfo) return null;

        const unreadCount = getUnreadCount(
          conversation.unreadCounts,
          session.user.id,
        );

        return {
          ...threadInfo,
          unreadCount,
          lastMessage: {
            text: conversation.lastMessage?.text || "",
            senderId: conversation.lastMessage?.senderId,
            sentAt:
              conversation.lastMessage?.sentAt ||
              conversation.updatedAt ||
              conversation.createdAt,
          },
          updatedAt:
            conversation.lastMessage?.sentAt ||
            conversation.updatedAt ||
            conversation.createdAt,
        };
      })
      .filter(Boolean);

    if (status !== "all") {
      threads = threads.filter((thread) => thread.orderStatus === status);
    }

    if (q) {
      threads = threads.filter((thread) =>
        [
          thread.orderNumber,
          thread.productName,
          thread.counterpart?.name,
          thread.lastMessage?.text,
        ]
          .map(normalizeText)
          .some((text) => text.includes(q)),
      );
    }

    if (sort === "oldest") {
      threads.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
    } else if (sort === "unread") {
      threads.sort((a, b) => {
        if (b.unreadCount !== a.unreadCount)
          return b.unreadCount - a.unreadCount;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
    } else {
      threads.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    const total = threads.length;
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const start = (page - 1) * limit;
    const paged = threads.slice(start, start + limit);

    return NextResponse.json({
      success: true,
      threads: paged,
      unreadThreads: threads.filter((thread) => thread.unreadCount > 0).length,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
      },
    });
  } catch (error) {
    console.error("Chat inbox GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

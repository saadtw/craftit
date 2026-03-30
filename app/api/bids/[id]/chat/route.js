import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Bid from "@/models/Bid";
import Conversation from "@/models/Chat";
import ChatMessage from "@/models/ChatMessage";

// Verify the user is a participant in this bid, return the bid if so
async function getAccessibleBid(bidId, session) {
  const bid = await Bid.findById(bidId).populate("rfqId", "customerId").lean();
  if (!bid) return null;

  const uid = session.user.id;
  const isManufacturer =
    session.user.role === "manufacturer" &&
    bid.manufacturerId.toString() === uid;
  const isCustomer =
    session.user.role === "customer" &&
    bid.rfqId?.customerId?.toString() === uid;

  if (!isManufacturer && !isCustomer) return null;
  return { bid, isManufacturer, isCustomer };
}

// Get or create the single conversation for this bid
async function getOrCreateConversation(bid) {
  let convo = await Conversation.findOne({
    contextType: "bid",
    contextId: bid._id,
  });

  if (!convo) {
    convo = await Conversation.create({
      participants: [bid.manufacturerId, bid.rfqId.customerId],
      contextType: "bid",
      contextId: bid._id,
    });
  }

  return convo;
}

// GET /api/bids/[id]/chat — fetch messages, supports ?since= for efficient polling
export async function GET(request, context) {
  const { id } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const access = await getAccessibleBid(id, session);
    if (!access)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const convo = await getOrCreateConversation(access.bid);

    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since");

    const query = { conversationId: convo._id };
    if (since) query.createdAt = { $gt: new Date(since) };

    const messages = await ChatMessage.find(query)
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    // Reset unread count for this user
    await Conversation.findByIdAndUpdate(convo._id, {
      $set: { [`unreadCounts.${session.user.id}`]: 0 },
    });

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/bids/[id]/chat — send a message
export async function POST(request, context) {
  const { id } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const access = await getAccessibleBid(id, session);
    if (!access)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { bid } = access;

    if (bid.status === "withdrawn" || bid.status === "rejected") {
      return NextResponse.json(
        { error: "Chat is closed for this bid" },
        { status: 400 },
      );
    }

    const body = await request.json();
    if (!body.message?.trim())
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 },
      );

    const convo = await getOrCreateConversation(bid);

    const newMessage = await ChatMessage.create({
      conversationId: convo._id,
      senderId: session.user.id,
      senderRole: session.user.role,
      senderName: session.user.name,
      message: body.message.trim(),
    });

    // Update conversation's lastMessage snapshot + increment other user's unread
    const otherParticipant = convo.participants.find(
      (p) => p.toString() !== session.user.id,
    );
    await Conversation.findByIdAndUpdate(convo._id, {
      lastMessage: {
        text: body.message.trim().slice(0, 100),
        senderId: session.user.id,
        sentAt: newMessage.createdAt,
      },
      $inc: { [`unreadCounts.${otherParticipant}`]: 1 },
    });

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

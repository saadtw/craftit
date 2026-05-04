import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatMessage from "@/models/ChatMessage";
import Dispute from "@/models/Dispute";
import { publish } from "@/lib/chatEmitter";
import { resolveRequestSession } from "@/lib/requestAuth";

export async function PATCH(request, context) {
  const { id } = await context.params;

  try {
    const session = await resolveRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { messageIds } = body;
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ success: true }); // No-op
    }

    const dispute = await Dispute.findById(id).lean();
    if (!dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    const uid = session.user.id;
    const role = session.user.role;

    if (role !== "admin") {
      const isCustomer = role === "customer" && dispute.customerId.toString() === uid;
      const isManufacturer = role === "manufacturer" && dispute.manufacturerId.toString() === uid;

      if (!isCustomer && !isManufacturer) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const readEntry = {
      userId: uid,
      readAt: new Date(),
    };

    await ChatMessage.updateMany(
      { _id: { $in: messageIds }, "readBy.userId": { $ne: uid } },
      { $push: { readBy: readEntry } }
    );

    publish(`dispute_${id}`, {
      type: "read_receipt",
      readerId: uid,
      messageIds,
      readAt: readEntry.readAt.toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dispute messages read PATCH error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

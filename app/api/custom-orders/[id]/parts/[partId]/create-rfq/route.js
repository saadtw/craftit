import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import CustomOrder from "@/models/CustomOrder";
import RFQ from "@/models/RFQ";
import { resolveRequestSession } from "@/lib/requestAuth";

export async function POST(request, context) {
  const params = await context.params;
  const { id, partId } = params;

  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();

    const customOrder = await CustomOrder.findById(id);

    if (!customOrder) {
      return NextResponse.json({ error: "Custom order not found" }, { status: 404 });
    }

    if (customOrder.customerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const part = customOrder.parts.id(partId);
    if (!part) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    if (part.rfqStatus !== 'pending') {
      return NextResponse.json({ error: "RFQ already created for this part" }, { status: 400 });
    }

    const startDate = new Date();
    const duration = body.duration || 168; // default 7 days
    const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);

    const rfq = await RFQ.create({
      customOrderId: customOrder._id,
      customerId: session.user.id,
      title: `[Part: ${part.name}] ${customOrder.title}`,
      duration,
      startDate,
      endDate,
      status: "active",
      minBidThreshold: part.budget ? part.budget * 0.5 : 0,
      targetManufacturers: [],
      broadcastToAll: true,
      
      isPartRFQ: true,
      partId: part._id,
      parentOrderId: customOrder._id,
    });

    part.rfqId = rfq._id;
    part.rfqStatus = 'rfq_created';
    await customOrder.save();

    return NextResponse.json({ success: true, rfq });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import CustomOrder from "@/models/CustomOrder";
import { resolveRequestSession } from "@/lib/requestAuth";

export async function GET(request, context) {
  const params = await context.params;
  const id = params.id;

  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const customOrder = await CustomOrder.findById(id).lean();

    if (!customOrder) {
      return NextResponse.json({ error: "Custom order not found" }, { status: 404 });
    }

    if (customOrder.customerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, parts: customOrder.parts || [] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, context) {
  const params = await context.params;
  const id = params.id;

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

    const newPart = {
      name: body.name,
      description: body.description,
      quantity: body.quantity || 1,
      material: body.material,
      colorSpec: body.colorSpec,
      budget: body.budget,
      deadline: body.deadline,
      specialRequirements: body.specialRequirements,
      annotationIds: body.annotationIds || [],
      measurementIds: body.measurementIds || [],
      rfqStatus: 'pending'
    };

    customOrder.parts.push(newPart);
    customOrder.isPartitioned = true;
    await customOrder.save();

    return NextResponse.json({ success: true, parts: customOrder.parts }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

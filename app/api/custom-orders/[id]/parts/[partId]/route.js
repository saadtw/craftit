import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import CustomOrder from "@/models/CustomOrder";
import { resolveRequestSession } from "@/lib/requestAuth";
import { deleteFromStorage } from "@/lib/storage";

export async function PATCH(request, context) {
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

    // Only allow update if RFQ hasn't been created yet
    if (part.rfqStatus !== 'pending') {
      return NextResponse.json({ error: "Cannot edit part after RFQ is created" }, { status: 400 });
    }

    // Update fields
    const allowedFields = ['name', 'description', 'quantity', 'material', 'colorSpec', 'budget', 'deadline', 'specialRequirements', 'annotationIds', 'measurementIds', 'model3D', 'images', 'files'];
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        part[field] = body[field];
      }
    });

    await customOrder.save();

    return NextResponse.json({ success: true, part });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const params = await context.params;
  const { id, partId } = params;

  try {
    const session = await resolveRequestSession(request);
    if (!session || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

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
      return NextResponse.json({ error: "Cannot delete part after RFQ is created" }, { status: 400 });
    }

    const urlsToDelete = [];
    if (part.model3D?.url) urlsToDelete.push(part.model3D.url);
    if (part.images?.length) urlsToDelete.push(...part.images.map(img => img.url));
    if (part.files?.length) urlsToDelete.push(...part.files.map(f => f.url));

    if (urlsToDelete.length > 0) {
      Promise.allSettled(urlsToDelete.map(url => deleteFromStorage(url))).catch(console.error);
    }

    customOrder.parts.pull(partId);
    if (customOrder.parts.length === 0) {
      customOrder.isPartitioned = false;
    }
    
    await customOrder.save();

    return NextResponse.json({ success: true, parts: customOrder.parts });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { resolveRequestSession } from "@/lib/requestAuth";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import CustomOrder from "@/models/CustomOrder";
import { deleteFromStorage } from "@/lib/storage";

// ── Resource config map ──────────────────────────────────────────────────────
const RESOURCE_CONFIG = {
  product: {
    model: Product,
    ownerField: "manufacturerId",
  },
  customOrder: {
    model: CustomOrder,
    ownerField: "customerId",
  },
};

// PATCH /api/models/update
export async function PATCH(request) {
  try {
    // ── 1. Authentication ────────────────────────────────────────────────────
    const session = await resolveRequestSession(request);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const sessionUserId = session.user.id?.toString();

    // ── 2. Parse & validate body ─────────────────────────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const {
      resourceId,
      resourceType,
      annotations,
      measurements,
      cameraState,
      dimensions,
      newModelUrl,
      newThumbnailUrl,
      newFileSize,
    } = body;

    if (!resourceId || typeof resourceId !== "string") {
      return NextResponse.json(
        { success: false, error: "resourceId is required and must be a string" },
        { status: 400 }
      );
    }

    if (!resourceType || typeof resourceType !== "string") {
      return NextResponse.json(
        { success: false, error: "resourceType is required and must be a string" },
        { status: 400 }
      );
    }

    // ── 3. Resolve resource config ───────────────────────────────────────────
    const config = RESOURCE_CONFIG[resourceType];
    if (!config) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported resourceType "${resourceType}". Allowed values: ${Object.keys(RESOURCE_CONFIG).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // ── 4. Database lookup ───────────────────────────────────────────────────
    await connectDB();

    const doc = await config.model
      .findById(resourceId)
      .select(`${config.ownerField} model3D`)
      .lean();

    if (!doc) {
      return NextResponse.json(
        { success: false, error: `${resourceType} not found` },
        { status: 404 }
      );
    }

    // ── 5. Ownership check ───────────────────────────────────────────────────
    const isAdmin = session.user.role === "admin";
    const ownerId = doc[config.ownerField]?.toString();

    if (!isAdmin && ownerId !== sessionUserId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: you do not own this resource" },
        { status: 403 }
      );
    }

    // ── 6. Build update payload ──────────────────────────────────────────────
    const updateFields = {};

    if (Array.isArray(annotations)) {
      // Store annotations as-is from the Vite editor.
      // Schema: { id, label, colour, worldPosition: [x,y,z], meshName }
      // The ModelViewerPreview reads these exact field names, so we must not remap them.
      updateFields["model3D.annotations"] = annotations;
    }

    if (Array.isArray(measurements)) {
      // Store measurements as-is from the Vite editor.
      // Schema: { id, label, pointA: [x,y,z], pointB: [x,y,z] }
      updateFields["model3D.measurements"] = measurements;
    }

    if (cameraState && typeof cameraState === "object") {
      updateFields["model3D.cameraState"] = {
        position: {
          x: Number(cameraState.position?.x ?? 0),
          y: Number(cameraState.position?.y ?? 0),
          z: Number(cameraState.position?.z ?? 0),
        },
        target: {
          x: Number(cameraState.target?.x ?? 0),
          y: Number(cameraState.target?.y ?? 0),
          z: Number(cameraState.target?.z ?? 0),
        },
        zoom: Number(cameraState.zoom ?? 1),
      };
    }

    if (dimensions && typeof dimensions === "object") {
      updateFields["model3D.dimensions"] = {
        length: Number(dimensions.length ?? 0),
        width: Number(dimensions.width ?? 0),
        height: Number(dimensions.height ?? 0),
        unit: ["mm", "cm", "m", "in", "ft"].includes(dimensions.unit)
          ? dimensions.unit
          : "mm",
      };
    }

    if (newModelUrl) updateFields["model3D.url"] = newModelUrl;
    if (newThumbnailUrl) updateFields["model3D.thumbnailUrl"] = newThumbnailUrl;
    if (newFileSize) updateFields["model3D.fileSize"] = newFileSize;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update." },
        { status: 400 }
      );
    }

    // ── 7. Persist & clean up old storage objects ────────────────────────────
    const oldModelUrl = doc.model3D?.url;
    const oldThumbnailUrl = doc.model3D?.thumbnailUrl;

    // If model3D is null in the database, MongoDB cannot $set dot-notation
    // fields like "model3D.annotations" — it throws PathNotViable.
    // Initialize model3D to {} first in that case.
    if (!doc.model3D) {
      await config.model.findByIdAndUpdate(
        resourceId,
        { $set: { model3D: {} } },
        { runValidators: false }
      );
    }

    // Update document first — only delete old files if this succeeds
    await config.model.findByIdAndUpdate(
      resourceId,
      { $set: updateFields },
      { runValidators: false, strict: false }
    );

    // Best-effort deletion of replaced Supabase Storage files
    if (newModelUrl && oldModelUrl && oldModelUrl !== newModelUrl) {
      await deleteFromStorage(oldModelUrl);
    }
    if (newThumbnailUrl && oldThumbnailUrl && oldThumbnailUrl !== newThumbnailUrl) {
      await deleteFromStorage(oldThumbnailUrl);
    }

    // ── 8. Success ───────────────────────────────────────────────────────────
    return NextResponse.json(
      {
        success: true,
        message: `model3D metadata updated on ${resourceType} ${resourceId}`,
        updatedFields: Object.keys(updateFields),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PATCH /api/models/update] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        detail:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

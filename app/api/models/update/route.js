import { NextResponse } from "next/server";
import { resolveRequestSession } from "@/lib/requestAuth";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import CustomOrder from "@/models/CustomOrder";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Initialize S3 Client for deletion logic
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ── Resource config map ─────────────────────────────────────────────────────
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
    // ── 1. Authentication ──────────────────────────────────────────────────
    const session = await resolveRequestSession(request);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const sessionUserId = session.user.id?.toString();

    // ── 2. Parse & validate body ────────────────────────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { resourceId, resourceType, annotations, cameraState, dimensions, newModelUrl, newThumbnailUrl, newFileSize } =
      body;

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

    // ── 3. Resolve the resource config ──────────────────────────────────────
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

    // ── 4. Database lookup ──────────────────────────────────────────────────
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

    // ── 5. Ownership check ──────────────────────────────────────────────────
    const isAdmin = session.user.role === "admin";
    const ownerId = doc[config.ownerField]?.toString();

    if (!isAdmin && ownerId !== sessionUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: you do not own this resource",
        },
        { status: 403 }
      );
    }

    // ── 6. Build the update payload ─────────────────────────────────────────
    const updateFields = {};

    if (Array.isArray(annotations)) {
      updateFields["model3D.annotations"] = annotations.map((a) => ({
        id: String(a.id ?? ""),
        text: String(a.text ?? ""),
        position: {
          x: Number(a.position?.x ?? 0),
          y: Number(a.position?.y ?? 0),
          z: Number(a.position?.z ?? 0),
        },
        normal: {
          x: Number(a.normal?.x ?? 0),
          y: Number(a.normal?.y ?? 0),
          z: Number(a.normal?.z ?? 0),
        },
      }));
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
        {
          success: false,
          error:
            "No valid fields to update.",
        },
        { status: 400 }
      );
    }

    // ── 7. Persist and Atomic Delete ──────────────────────────────────────────
    // Safety check: preserve the original URL. We only delete it IF the MongoDB update succeeds.
    const oldModelUrl = doc.model3D?.url;
    
    // 1. Update the document first.
    await config.model.findByIdAndUpdate(
      resourceId,
      { $set: updateFields },
      { runValidators: false }
    );

    // 2. If MongoDB update was successful, delete old S3 objects that were replaced.
    // This prevents broken links if the update fails — we only delete AFTER a successful DB write.
    const s3Prefix = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`;

    const keysToDelete = [];

    if (newModelUrl && oldModelUrl && oldModelUrl !== newModelUrl && oldModelUrl.startsWith(s3Prefix)) {
      keysToDelete.push(decodeURIComponent(oldModelUrl.replace(s3Prefix, "")));
    }

    const oldThumbnailUrl = doc.model3D?.thumbnailUrl;
    if (newThumbnailUrl && oldThumbnailUrl && oldThumbnailUrl !== newThumbnailUrl && oldThumbnailUrl.startsWith(s3Prefix)) {
      keysToDelete.push(decodeURIComponent(oldThumbnailUrl.replace(s3Prefix, "")));
    }

    for (const oldKey of keysToDelete) {
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: oldKey,
        }));
        console.log(`[S3 Cleanup] Successfully deleted old S3 object: ${oldKey}`);
      } catch (s3Error) {
        console.warn(`[S3 Orphan Warning] DB updated, but failed to delete: ${oldKey}`, s3Error);
      }
    }

    // ── 8. Success ──────────────────────────────────────────────────────────
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

import { NextResponse } from "next/server";
import { resolveRequestSession } from "@/lib/requestAuth";
import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = "craftit-uploads";

const FILE_TYPES = {
  "3d-model": {
    extensions: [".stl", ".obj", ".gltf", ".glb"],
    maxSize: 50 * 1024 * 1024, // 100MB
    folder: "3d-models",
  },
  image: {
    extensions: [".jpg", ".jpeg", ".png", ".webp"],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: "images",
  },
  document: {
    extensions: [".pdf", ".doc", ".docx"],
    maxSize: 20 * 1024 * 1024, // 20MB
    folder: "documents",
  },
};

/**
 * POST /api/upload/presign
 * Returns a signed upload URL so the client can PUT the file directly to
 * Supabase Storage, bypassing the Next.js server for large files.
 *
 * Body: { filename: string, fileType: "3d-model"|"image"|"document", size: number }
 * Returns: { signedUrl, path, publicUrl, token }
 */
export async function POST(request) {
  try {
    const session = await resolveRequestSession(request);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const { filename, fileType, size } = body;

    if (!filename || !fileType || typeof size !== "number") {
      return NextResponse.json(
        { success: false, error: "filename, fileType, and size are required" },
        { status: 400 },
      );
    }

    const fileConfig = FILE_TYPES[fileType];
    if (!fileConfig) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid fileType. Allowed: ${Object.keys(FILE_TYPES).join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate extension
    const lowerName = filename.toLowerCase();
    const isValidExt = fileConfig.extensions.some((ext) =>
      lowerName.endsWith(ext),
    );
    if (!isValidExt) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file extension. Allowed for ${fileType}: ${fileConfig.extensions.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate size
    if (size > fileConfig.maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Max size for ${fileType}: ${fileConfig.maxSize / 1024 / 1024}MB`,
        },
        { status: 400 },
      );
    }

    // Build a unique storage path
    const timestamp = Date.now();
    const sanitized = filename
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9.\-_]/g, "");
    const storagePath = `${fileConfig.folder}/${timestamp}-${sanitized}`;

    // Create signed upload URL (valid for 60 seconds)
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath);

    if (error || !data?.signedUrl) {
      console.error("[Presign] Failed to create signed URL:", error?.message);
      return NextResponse.json(
        { success: false, error: "Failed to generate upload URL" },
        { status: 500 },
      );
    }

    // Construct the final public URL — the file will be accessible here after upload completes
    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
      token: data.token,
      path: storagePath,
      publicUrl,
    });
  } catch (error) {
    console.error("[Presign] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

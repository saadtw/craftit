import { NextResponse } from "next/server";
import { resolveRequestSession } from "@/lib/requestAuth";
import { uploadToStorage } from "@/lib/storage";
import path from "path";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const IMAGE_MAX_SIZE = 10 * 1024 * 1024;

// POST /api/upload/multiple — upload multiple files to Supabase Storage
export async function POST(request) {
  try {
    // Authentication
    const session = await resolveRequestSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files");
    const folder = formData.get("folder") || "uploads";

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided" },
        { status: 400 },
      );
    }

    const uploadedFiles = [];
    const errors = [];

    for (const file of files) {
      try {
        const fileName = file?.name?.toLowerCase?.() || "";
        const ext = path.extname(fileName).toLowerCase();

        if (!IMAGE_EXTENSIONS.includes(ext)) {
          errors.push({
            filename: file?.name || "unknown",
            error: `Invalid file extension. Allowed: ${IMAGE_EXTENSIONS.join(", ")}`,
          });
          continue;
        }

        if (file.size > IMAGE_MAX_SIZE) {
          errors.push({
            filename: file?.name || "unknown",
            error: `File too large. Max size: ${IMAGE_MAX_SIZE / 1024 / 1024}MB`,
          });
          continue;
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const sanitizedName = file.name.replace(/\s+/g, "-");
        const storagePath = `${folder}/${timestamp}-${random}-${sanitizedName}`;

        const publicUrl = await uploadToStorage(buffer, storagePath, file.type);

        uploadedFiles.push({
          url: publicUrl,
          filename: file.name,
          fileSize: file.size,
        });
      } catch (error) {
        errors.push({ filename: file.name, error: error.message });
      }
    }

    if (uploadedFiles.length === 0) {
      const firstError = errors[0]?.error || "No files were uploaded";
      return NextResponse.json(
        {
          success: false,
          error: firstError,
          message: `Uploaded 0 of ${files.length} files`,
          files: [],
          errors,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Uploaded ${uploadedFiles.length} of ${files.length} files`,
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[Upload/Multiple] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

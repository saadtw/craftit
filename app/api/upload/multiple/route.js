import { NextResponse } from "next/server";
import { resolveRequestSession } from "@/lib/requestAuth";
import { uploadToStorage } from "@/lib/storage";

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

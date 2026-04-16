import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveRequestSession } from "@/lib/requestAuth";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// POST /api/upload/multiple - Handle multiple file uploads to S3
export async function POST(request) {
  try {
    // Check authentication
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
        const uniqueFileName = `${folder}/${timestamp}-${random}-${sanitizedName}`;

        const command = new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: uniqueFileName,
          Body: buffer,
          ContentType: file.type,
        });

        await s3Client.send(command);

        const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`;

        uploadedFiles.push({
          url: fileUrl,
          filename: file.name,
          fileSize: file.size,
        });
      } catch (error) {
        errors.push({
          filename: file.name,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Uploaded ${uploadedFiles.length} of ${files.length} files`,
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

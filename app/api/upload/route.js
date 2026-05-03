import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { resolveRequestSession } from "@/lib/requestAuth";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// App Router configuration to bypass timeout constraints on Vercel/serverless environments
export const maxDuration = 300; // 5 minutes

const FILE_TYPES = {
  "3d-model": {
    extensions: [".stl", ".obj", ".gltf", ".glb"],
    maxSize: 100 * 1024 * 1024, // 100MB
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

// POST /api/upload
export async function POST(request) {
  try {
    // Consume the request stream as formData immediately
    const formData = await request.formData();
    const file = formData.get("file");
    const fileType = formData.get("type"); // '3d-model' or 'image' or 'document'

    // Log incoming request
    if (file) {
      console.log(`Incoming request: ${file.name} - ${file.size} bytes`);
    } else {
      console.log(`Incoming request: No file attached`);
    }

    // Check authentication
    const session = await resolveRequestSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    // Validate file type
    const fileConfig = FILE_TYPES[fileType];
    if (!fileConfig) {
      return NextResponse.json(
        { success: false, error: "Invalid file type" },
        { status: 400 },
      );
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    const ext = fileName.substring(fileName.lastIndexOf("."));
    const isValidExt = fileConfig.extensions.some((e) => fileName.endsWith(e));

    if (!isValidExt) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file extension. Allowed: ${fileConfig.extensions.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Check file size
    if (file.size > fileConfig.maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Max size: ${fileConfig.maxSize / 1024 / 1024}MB`,
        },
        { status: 400 },
      );
    }

    // Convert to buffer
    const bytes = await file.arrayBuffer();
    let buffer = Buffer.from(bytes);
    let uploadContentType = file.type;
    let finalFileName = file.name;

    // ── 3D Model Processing ─────────────────────────────────────────────────
    if (fileType === "3d-model") {
      const isWebReady = (ext === ".glb" || ext === ".gltf");
      const isUnderLimit = file.size < 25165824; // 24MB (25,165,824 bytes)

      if (isWebReady && isUnderLimit) {
        // Branch A (Fast-Track): Small web-ready files skip the optimizer entirely
        console.log("[FAST-TRACK] Skipping optimizer for web-ready asset under 25MB");
        if (!uploadContentType) {
          uploadContentType = "model/gltf-binary";
        }
      } else {
        // Branch B (Pipeline): Send to the FastAPI optimizer microservice
        console.log("[PIPELINE] Sending to optimizer microservice for processing");

        const optimizerUrl = process.env.OPTIMIZER_URL || "http://localhost:5000";

        try {
          // Build a new FormData to forward the file to the optimizer
          const optimizerForm = new FormData();
          optimizerForm.append(
            "file",
            new Blob([buffer], { type: file.type || "application/octet-stream" }),
            file.name,
          );

          const optimizerRes = await fetch(`${optimizerUrl}/optimize`, {
            method: "POST",
            body: optimizerForm,
          });

          if (!optimizerRes.ok) {
            const errorText = await optimizerRes.text();
            throw new Error(`Optimizer responded with ${optimizerRes.status}: ${errorText}`);
          }

          // Read the optimized binary back into a Node buffer
          const optimizedArrayBuffer = await optimizerRes.arrayBuffer();
          buffer = Buffer.from(optimizedArrayBuffer);
          uploadContentType = "model/gltf-binary";

          // Change filename to reflect the .glb output
          finalFileName = file.name.replace(new RegExp(`\\${ext}$`, "i"), ".glb");

          const jobId = optimizerRes.headers.get("X-Optimizer-Job-Id") || "unknown";
          const processingTime = optimizerRes.headers.get("X-Processing-Time-Seconds") || "?";
          console.log(
            `[PIPELINE] Optimizer job ${jobId} completed in ${processingTime}s. ` +
            `Output size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`,
          );
        } catch (convErr) {
          console.error("3D Optimization error:", convErr);
          throw new Error("Failed to optimize 3D model: " + convErr.message);
        }
      }
    }

    // ── S3 Upload ───────────────────────────────────────────────────────────
    const timestamp = Date.now();
    const sanitizedName = finalFileName.replace(/\s+/g, "-");
    const uniqueFileName = `${fileConfig.folder}/${timestamp}-${sanitizedName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: uniqueFileName,
      Body: buffer,
      ContentType: uploadContentType,
    });

    await s3Client.send(command);

    // Generate public URL
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      file: {
        url: fileUrl,
        filename: finalFileName,
        fileSize: buffer.length,
        type: fileType,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

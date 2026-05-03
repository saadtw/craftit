import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { authOptions } from "@/lib/auth";
import { resolveRequestSession } from "@/lib/requestAuth";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execPromise = promisify(exec);

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// App Router configuration to bypass timeout constraints on Vercel/serverless environments
export const maxDuration = 300; // 5 minutes

// Note: In Next.js App Router, 'export const config = { api: { bodyParser: false } }' is not used. 
// Route Handlers (app/**/route.js) do not automatically parse the body, so they natively support streaming large files.
// Ensure your next.config.js does not have any conflicting bodySizeLimit constraints if you are using Server Actions alongside this.

const FILE_TYPES = {
  "3d-model": {
    extensions: [".stl", ".obj", ".gltf", ".glb"],
    maxSize: 100 * 1024 * 1024, // Increased to 100MB
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
    // We immediately consume the request stream as formData to prevent Next.js from throwing size limits
    const formData = await request.formData();
    const file = formData.get("file");
    const fileType = formData.get("type"); // '3d-model' or 'image' or 'document'
    
    // Requirement: Add a console.log at the very beginning to verify request
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
    const isValidExt = fileConfig.extensions.some((ext) =>
      fileName.endsWith(ext),
    );

    if (!isValidExt) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file extension. Allowed: ${fileConfig.extensions.join(
            ", ",
          )}`,
        },
        { status: 400 },
      );
    }

    // Check file size
    if (file.size > fileConfig.maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Max size: ${fileConfig.maxSize / 1024 / 1024
            }MB`,
        },
        { status: 400 },
      );
    }

    // Convert to buffer
    const bytes = await file.arrayBuffer();
    let buffer = Buffer.from(bytes);
    let uploadContentType = file.type;
    let finalFileName = file.name;

    let tempInputPath = null;
    let tempOutputPath = null;

    if (fileType === "3d-model") {
      const ext = path.extname(fileName).toLowerCase();
      const isWebReady = (ext === ".glb" || ext === ".gltf");
      const isUnderLimit = file.size < 25165824; // 24MB limit (25,165,824 bytes)

      if (isWebReady && isUnderLimit) {
        // Branch A (Fast-Track)
        console.log("[FAST-TRACK] Skipping converter for web-ready asset under 25MB");
        if (!uploadContentType) {
          uploadContentType = "model/gltf-binary";
        }
      } else {
        // Branch B (Pipeline)
        console.log("[PIPELINE] Sending to Python for optimization/conversion");
        try {
          const tempDir = os.tmpdir();
          const timestampStr = Date.now().toString();
          tempInputPath = path.join(tempDir, `input-${timestampStr}${ext}`);
          tempOutputPath = path.join(tempDir, `output-${timestampStr}.glb`);

          // Write the incoming Next.js File arrayBuffer to the inputFilePath on disk
          await fs.writeFile(tempInputPath, buffer);

          // Execute the Python script
          const pythonScriptPath = path.join(process.cwd(), "python-converters", "converter.py");
          const { stdout, stderr } = await execPromise(
            `python "${pythonScriptPath}" "${tempInputPath}" "${tempOutputPath}"`
          );

          if (stderr && stderr.includes("FATAL:")) {
            throw new Error(`Conversion failed: ${stderr}`);
          }

          // Read the newly created .glb file
          buffer = await fs.readFile(tempOutputPath);
          uploadContentType = "model/gltf-binary";

          // Change the S3 key/filename to reflect the new .glb extension
          finalFileName = file.name.replace(new RegExp(`\\${ext}$`, "i"), ".glb");
        } catch (convErr) {
          console.error("3D Conversion error:", convErr);
          throw new Error("Failed to convert 3D model: " + convErr.message);
        } finally {
          // Cleanup
          if (tempInputPath) {
            await fs.unlink(tempInputPath).catch(() => { });
          }
          if (tempOutputPath) {
            await fs.unlink(tempOutputPath).catch(() => { });
          }
        }
      }
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = finalFileName.replace(/\s+/g, "-");
    const uniqueFileName = `${fileConfig.folder}/${timestamp}-${sanitizedName}`;

    // Upload to S3
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

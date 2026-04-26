import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";
import os from "os";
import util from "util";

const execPromise = util.promisify(require("child_process").exec);

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const FILE_TYPES = {
  "3d-model": {
    extensions: [".stl", ".obj", ".gltf", ".glb"],
    maxSize: 50 * 1024 * 1024, // 50MB
    folder: "3d-models",
  },
  image: {
    extensions: [".jpg", ".jpeg", ".png", ".webp"],
    maxSize: 5 * 1024 * 1024, // 5MB
    folder: "images",
  },
  document: {
    extensions: [".pdf", ".doc", ".docx"],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: "documents",
  },
};

// POST /api/upload
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
    const file = formData.get("file");
    const fileType = formData.get("type"); // '3d-model' or 'image' or 'document'

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
          error: `File too large. Max size: ${
            fileConfig.maxSize / 1024 / 1024
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
      if (ext !== ".glb" && ext !== ".gltf") {
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
            await fs.unlink(tempInputPath).catch(() => {});
          }
          if (tempOutputPath) {
            await fs.unlink(tempOutputPath).catch(() => {});
          }
        }
      } else {
        if (!uploadContentType) {
          uploadContentType = "model/gltf-binary";
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

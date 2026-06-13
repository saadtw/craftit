import { NextResponse } from "next/server";
import { resolveRequestSession } from "@/lib/requestAuth";
import { uploadToStorage, deleteFromStorage } from "@/lib/storage";
import path from "path";

// App Router configuration to give the converter service enough time on Vercel/serverless
export const maxDuration = 60;

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

function getGltfExternalDependencies(buffer) {
  try {
    const gltf = JSON.parse(buffer.toString("utf8"));
    const uris = [
      ...(gltf.buffers || []).map((item) => item?.uri),
      ...(gltf.images || []).map((item) => item?.uri),
    ].filter(Boolean);

    return uris.filter((uri) => {
      const normalized = String(uri).trim().toLowerCase();
      return (
        normalized &&
        !normalized.startsWith("data:") &&
        !normalized.startsWith("blob:")
      );
    });
  } catch {
    return null;
  }
}

// POST /api/upload
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const fileType = formData.get("type"); // '3d-model' | 'image' | 'document'

    if (file) {
      console.log(`[Upload] Incoming: ${file.name} — ${file.size} bytes`);
    } else {
      console.log("[Upload] Incoming: No file attached");
    }

    // Authentication
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

    // Validate file type config
    const fileConfig = FILE_TYPES[fileType];
    if (!fileConfig) {
      return NextResponse.json(
        { success: false, error: "Invalid file type" },
        { status: 400 },
      );
    }

    // Check extension
    const fileName = file.name.toLowerCase();
    const ext = path.extname(fileName).toLowerCase();
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

    // Check size
    if (file.size > fileConfig.maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Max size: ${fileConfig.maxSize / 1024 / 1024}MB`,
        },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    let buffer = Buffer.from(bytes);
    let uploadContentType = file.type;
    let finalFileName = file.name;

    const timestamp = Date.now();

    if (fileType === "3d-model") {
      const isWebReady = ext === ".glb";
      const isUnderLimit = file.size < 25165824; // 24 MB

      if (isWebReady && isUnderLimit) {
        // ── Branch A: Fast-track — no conversion needed ──────────────────
        console.log(
          "[Upload] FAST-TRACK: skipping converter (GLB, <24MB)",
        );
        if (!uploadContentType) uploadContentType = "model/gltf-binary";

        const sanitizedName = finalFileName.replace(/\s+/g, "-");
        const storagePath = `${fileConfig.folder}/${timestamp}-${sanitizedName}`;
        const publicUrl = await uploadToStorage(
          buffer,
          storagePath,
          uploadContentType,
        );

        return NextResponse.json({
          success: true,
          file: {
            url: publicUrl,
            filename: finalFileName,
            fileSize: buffer.length,
            type: fileType,
          },
        });
      } else {
        if (ext === ".gltf") {
          const externalDeps = getGltfExternalDependencies(buffer);
          if (externalDeps === null) {
            return NextResponse.json(
              {
                success: false,
                error:
                  "Invalid GLTF file. Please upload a valid .glb file or an embedded .gltf file.",
              },
              { status: 400 },
            );
          }

          if (externalDeps.length > 0) {
            return NextResponse.json(
              {
                success: false,
                error:
                  "This .gltf references external .bin or texture files. Please export/upload a single self-contained .glb file.",
                missingAssets: externalDeps,
              },
              { status: 400 },
            );
          }
        }

        // ── Branch B: Pipeline — stream file to converter, upload returned GLB ──
        // The converter is a pure transform service: it accepts a file, returns
        // the converted GLB binary. Next.js handles all Supabase uploads.
        console.log("[Upload] PIPELINE: streaming file directly to converter service");

        const baseName = path.basename(file.name, ext);
        const convertedPath = `3d-models/converted/${timestamp}-${baseName}.glb`;
        const converterUrl = process.env.CONVERTER_SERVICE_URL;
        const converterSecret = process.env.CONVERTER_SECRET;

        if (!converterUrl) {
          console.warn("[Upload] CONVERTER_SERVICE_URL not set");
          return NextResponse.json(
            {
              success: false,
              error:
                "3D model conversion is not configured. Please upload a .glb file or configure CONVERTER_SERVICE_URL.",
            },
            { status: 500 },
          );
        }

        // Build multipart payload: send buffer directly to converter
        const formPayload = new FormData();
        formPayload.append(
          "file",
          new Blob([buffer], { type: uploadContentType || "application/octet-stream" }),
          file.name,
        );
        formPayload.append("original_filename", file.name);

        let finalUrl;
        try {
          console.log(`[Upload] Sending ${buffer.length} bytes to converter...`);
          const converterRes = await fetch(`${converterUrl}/convert`, {
            method: "POST",
            headers: { Authorization: `Bearer ${converterSecret}` },
            // Do NOT set Content-Type — fetch sets the multipart boundary automatically
            body: formPayload,
          });

          if (!converterRes.ok) {
            const errText = await converterRes.text().catch(() => "unknown error");
            throw new Error(`Converter HTTP ${converterRes.status}: ${errText}`);
          }

          // Converter returns the GLB as binary — upload it to Supabase from here
          const glbBuffer = Buffer.from(await converterRes.arrayBuffer());
          console.log(`[Upload] Converter returned ${glbBuffer.length} bytes — uploading to Supabase`);
          finalUrl = await uploadToStorage(glbBuffer, convertedPath, "model/gltf-binary");
          finalFileName = `${baseName}.glb`;
          console.log(`[Upload] Pipeline complete. URL: ${finalUrl}`);
        } catch (convErr) {
          console.error("[Upload] Converter error:", convErr.message);
          return NextResponse.json(
            {
              success: false,
              error:
                "3D model conversion failed. Please upload a self-contained .glb file.",
            },
            { status: 422 },
          );
        }

        return NextResponse.json({
          success: true,
          file: { url: finalUrl, filename: finalFileName, fileSize: buffer.length, type: fileType },
        });
      }
    }

    // ── Images & Documents: simple direct upload ────────────────────────────
    const sanitizedName = finalFileName.replace(/\s+/g, "-");
    const storagePath = `${fileConfig.folder}/${timestamp}-${sanitizedName}`;
    const publicUrl = await uploadToStorage(
      buffer,
      storagePath,
      uploadContentType,
    );

    return NextResponse.json({
      success: true,
      file: {
        url: publicUrl,
        filename: finalFileName,
        fileSize: buffer.length,
        type: fileType,
      },
    });
  } catch (error) {
    console.error("[Upload] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

/**
 * lib/uploadDirect.js
 * Client-side helper for direct-to-Supabase-Storage uploads using signed URLs.
 * Bypasses the Next.js server for large files, eliminating memory/timeout issues.
 *
 * Usage:
 *   import { uploadFileDirect } from "@/lib/uploadDirect";
 *   const result = await uploadFileDirect(file, "3d-model", (pct) => setProgress(pct));
 *   // result: { url, filename, fileSize }
 */

const NEEDS_CONVERSION_EXTS = [".stl", ".obj", ".ply"];
const LARGE_FILE_THRESHOLD = 25165824; // 24 MB

/**
 * Upload a file directly to Supabase Storage via a presigned URL.
 * For 3D models that need conversion (non-GLB or >24MB), triggers the
 * async converter endpoint after the direct upload completes.
 *
 * @param {File} file - The File object to upload
 * @param {"3d-model"|"image"|"document"} fileType
 * @param {(percent: number) => void} [onProgress] - Progress callback (0-100)
 * @returns {Promise<{ url: string, filename: string, fileSize: number }>}
 */
export async function uploadFileDirect(file, fileType, onProgress) {
  // 1. Request a signed upload URL from the server
  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, fileType, size: file.size }),
  });

  const presignData = await presignRes.json();
  if (!presignRes.ok || !presignData.success) {
    throw new Error(presignData.error || "Failed to get upload URL");
  }

  const { signedUrl, path: storagePath, publicUrl } = presignData;

  // 2. PUT the file directly to Supabase Storage using XMLHttpRequest
  //    (fetch does not support upload progress events)
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && typeof onProgress === "function") {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress(pct);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: HTTP ${xhr.status} — ${xhr.responseText}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.send(file);
  });

  if (typeof onProgress === "function") onProgress(100);

  // 3. For 3D models that need conversion, trigger the async converter
  if (fileType === "3d-model") {
    const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
    const needsConversion =
      NEEDS_CONVERSION_EXTS.includes(ext) || file.size > LARGE_FILE_THRESHOLD;

    if (needsConversion) {
      try {
        const convertRes = await fetch("/api/upload/convert-async", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storagePath }),
        });
        const convertData = await convertRes.json();

        if (convertRes.ok && convertData.success) {
          // The converter always outputs a .glb file
          const newFilename = file.name.replace(/\.[^.]+$/, "") + ".glb";
          return { url: convertData.url, filename: newFilename, fileSize: file.size };
        }
        // Conversion failed — fall back to the raw file URL
        console.warn("[uploadDirect] Conversion failed, using raw URL:", convertData.error);
      } catch (convErr) {
        console.warn("[uploadDirect] Conversion request error:", convErr.message);
      }
    }
  }

  // 4. Return the public URL (direct for images/documents, or raw fallback for 3D)
  return { url: publicUrl, filename: file.name, fileSize: file.size };
}

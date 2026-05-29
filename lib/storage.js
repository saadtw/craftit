/**
 * lib/storage.js
 * Shared Supabase Storage helper for upload, delete, and URL extraction.
 *
 * IMPORTANT: The 'craftit-uploads' bucket must be created in the Supabase dashboard
 * with PUBLIC access enabled so that public URLs are accessible without a token.
 *
 * Expected environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SUPABASE_SECRET_KEY
 */

import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = "craftit-uploads";

/**
 * Uploads a buffer to Supabase Storage and returns the public URL.
 * @param {Buffer} buffer - File data
 * @param {string} storagePath - e.g. "3d-models/1234-model.glb"
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} Public URL
 */
export async function uploadToStorage(buffer, storagePath, contentType) {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error("[Storage] Upload failed:", error.message);
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: urlData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  return urlData.publicUrl;
}

/**
 * Extracts the storage path from a full Supabase public URL.
 * URL format: https://<project>.supabase.co/storage/v1/object/public/craftit-uploads/<path>
 * @param {string} publicUrl
 * @returns {string|null} Storage path or null if not a Supabase URL
 */
export function getStoragePath(publicUrl) {
  if (!publicUrl) return null;
  const marker = `/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

/**
 * Deletes a file from Supabase Storage by its public URL.
 * Logs a warning on failure but never throws (deletion is best-effort).
 * @param {string} publicUrl
 * @returns {Promise<boolean>} true if deleted, false on error
 */
export async function deleteFromStorage(publicUrl) {
  const storagePath = getStoragePath(publicUrl);
  if (!storagePath) {
    console.warn("[Storage] Could not extract path from URL:", publicUrl);
    return false;
  }

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .remove([storagePath]);

  if (error) {
    console.warn("[Storage] Deletion failed (orphan may remain):", error.message, "Path:", storagePath);
    return false;
  }

  console.log("[Storage] Deleted:", storagePath);
  return true;
}

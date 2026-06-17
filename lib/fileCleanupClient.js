/**
 * lib/fileCleanupClient.js
 * Client-side helper to trigger file cleanup from Supabase (and optionally MongoDB)
 */

/**
 * Clean up files by their URLs.
 * @param {string[]} urls - Array of public URLs to delete from Supabase
 * @param {Object} [origin] - Optional. { type: "Product" | "CustomOrder", id: "mongoId" }
 * @returns {Promise<boolean>}
 */
export async function cleanupFiles(urls, origin = null) {
  if (!urls || urls.length === 0) return true;

  try {
    const res = await fetch("/api/files/cleanup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urls, origin }),
    });

    const data = await res.json();
    if (!data.success) {
      console.warn("File cleanup failed:", data.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error calling file cleanup API:", error);
    return false;
  }
}

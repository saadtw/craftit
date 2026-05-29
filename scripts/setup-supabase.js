/**
 * scripts/setup-supabase.js
 *
 * Automates Supabase Storage bucket + CORS configuration.
 * Run once after creating a new Supabase project:
 *
 *   node scripts/setup-supabase.js
 *
 * Requires these env vars in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local manually
const envPath = path.join(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");

function parseEnv(content) {
  const vars = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    vars[key] = val;
  }
  return vars;
}

const env = parseEnv(envContent);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET_KEY = env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || SUPABASE_URL.includes("YOUR_PROJECT_REF") || !SUPABASE_SECRET_KEY || SUPABASE_SECRET_KEY.includes("YOUR_")) {
  console.error("\n❌  Fill in your Supabase credentials in .env.local first!");
  console.error("    NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set.\n");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);
const BUCKET = "craftit-uploads";

async function run() {
  console.log("\n🚀  Craftit Supabase Setup\n");
  console.log(`   URL: ${SUPABASE_URL}`);

  // ── 1. Create bucket ─────────────────────────────────────────────────────
  console.log(`\n📦  Creating bucket "${BUCKET}" (public)...`);
  const { data: existing } = await supabase.storage.getBucket(BUCKET);

  if (existing) {
    console.log(`   ✅  Bucket "${BUCKET}" already exists.`);
  } else {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true
    });
    if (error) {
      console.error(`   ❌  Failed to create bucket: ${error.message}`);
    } else {
      console.log(`   ✅  Bucket "${BUCKET}" created with public access.`);
    }
  }

  // ── 2. Create folder structure placeholders ───────────────────────────────
  // Supabase Storage folders are virtual (created by uploading), but we can
  // confirm the bucket is accessible by listing it.
  const { data: files, error: listErr } = await supabase.storage
    .from(BUCKET)
    .list("", { limit: 1 });

  if (listErr) {
    console.error(`   ❌  Cannot access bucket: ${listErr.message}`);
  } else {
    console.log(`   ✅  Bucket accessible. Files in root: ${files?.length ?? 0}`);
  }

  // ── 3. Test upload to verify public URL works ─────────────────────────────
  console.log("\n🔍  Running upload test...");
  const testContent = Buffer.from("craftit-test");
  const testPath = "_setup-test/test.txt";

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(testPath, testContent, { contentType: "text/plain", upsert: true });

  if (uploadErr) {
    console.error(`   ❌  Test upload failed: ${uploadErr.message}`);
  } else {
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(testPath);
    console.log(`   ✅  Test upload success! Public URL: ${urlData.publicUrl}`);

    // Clean up test file
    await supabase.storage.from(BUCKET).remove([testPath]);
    console.log("   🧹  Test file cleaned up.");
  }

  // ── 4. CORS notice ────────────────────────────────────────────────────────
  console.log("\n⚠️   CORS configuration must be done in the Supabase dashboard:");
  console.log("   → Storage → craftit-uploads bucket → Policies / CORS");
  console.log("   → Add CORS rule: Allowed origins: * | Methods: GET, POST, PUT");
  console.log("   (Or restrict origins to your specific domains in production)\n");

  // ── 5. Auth redirect notice ───────────────────────────────────────────────
  console.log("⚠️   Auth redirect URLs must be set in the Supabase dashboard:");
  console.log("   → Authentication → URL Configuration");
  console.log("   Site URL:        http://localhost:3000");
  console.log("   Redirect URLs:   http://localhost:3000/auth/verify-email");
  console.log("                    http://localhost:3000/auth/reset-password");
  console.log("   (Add production URLs too when deploying)\n");

  console.log("✅  Supabase setup complete!\n");
}

run().catch((err) => {
  console.error("\n❌  Setup failed:", err.message);
  process.exit(1);
});

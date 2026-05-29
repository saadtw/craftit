// lib/supabase.js
import { createClient } from "@supabase/supabase-js";

// Browser-safe client — uses the publishable key
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder_publishable_key"
);

// Server-only admin client — uses the secret key
//    Import this ONLY inside API route files (app/api/...)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder_secret_key"
);

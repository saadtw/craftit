// lib/supabase.js
import { createClient } from "@supabase/supabase-js";

// Browser-safe client — uses the anon key
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Server-only admin client — uses the secret service role key
//    Import this ONLY inside API route files (app/api/...)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

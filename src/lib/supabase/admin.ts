import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/env";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const ADMIN_READY = SUPABASE_URL !== "" && SERVICE_KEY !== "";

export function createAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "layerup" },
  });
}

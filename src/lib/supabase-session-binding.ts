import type { SupabaseClient } from "@supabase/supabase-js";
import { getVerifiedSupabaseSessionId } from "@/lib/supabase-auth-server";

/** Bind step-up cookie to the verified Supabase login session. */
export async function getSupabaseSessionBinding(
  supabase: SupabaseClient,
): Promise<string | null> {
  return getVerifiedSupabaseSessionId(supabase);
}

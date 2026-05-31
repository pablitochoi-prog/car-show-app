import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseSessionIdFromAccessToken } from "@/lib/step-up-session";

/**
 * Read session_id from the verified JWT after `getUser()`.
 * Uses access_token only — never reads session.user (avoids Supabase insecure-user warning).
 */
export async function getSupabaseSessionBinding(
  supabase: SupabaseClient,
): Promise<string | null> {
  await supabase.auth.getUser();
  const { data } = await supabase.auth.getSession();
  return getSupabaseSessionIdFromAccessToken(data.session?.access_token);
}

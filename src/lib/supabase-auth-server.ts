import { cache } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type AccessTokenPayload = {
  aal?: string;
  session_id?: string;
};

/** Decode a Supabase access token JWT payload (no signature verification). */
export function decodeAccessTokenPayload(
  accessToken: string,
): AccessTokenPayload | null {
  const parts = accessToken.split(".");
  if (parts.length < 2) return null;
  try {
    return JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as AccessTokenPayload;
  } catch {
    return null;
  }
}

async function getVerifiedSupabaseUserUncached(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Verified Supabase auth user for server routes/components.
 * Always prefer this over auth.getSession().session.user.
 */
export const getVerifiedSupabaseUser = cache(getVerifiedSupabaseUserUncached);

/**
 * Access token for the current session on an existing client.
 * Calls getUser() first; then reads access_token only (never session.user).
 */
export async function getSessionAccessToken(
  supabase: SupabaseClient,
): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Access token using a fresh server client (for routes without an existing client). */
export async function getVerifiedSessionAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  return getSessionAccessToken(supabase);
}

/** session_id claim from the verified access token — for step-up cookie binding. */
export async function getVerifiedSupabaseSessionId(
  supabase?: SupabaseClient,
): Promise<string | null> {
  const accessToken = supabase
    ? await getSessionAccessToken(supabase)
    : await getVerifiedSessionAccessToken();
  if (!accessToken) return null;
  const payload = decodeAccessTokenPayload(accessToken);
  return typeof payload?.session_id === "string" ? payload.session_id : null;
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { decodeAccessTokenPayload } from "@/lib/supabase-auth-server";

export type MfaSessionState = {
  hasVerifiedTotp: boolean;
  verifiedFactorId: string | null;
  currentLevel: string;
  nextLevel: string;
  /** User enrolled TOTP but this session is still AAL1 — needs MFA challenge. */
  needsMfaVerification: boolean;
};

const EMPTY_MFA_STATE: MfaSessionState = {
  hasVerifiedTotp: false,
  verifiedFactorId: null,
  currentLevel: "aal1",
  nextLevel: "aal1",
  needsMfaVerification: false,
};

/**
 * Read MFA assurance level and verified TOTP factors using getUser() only.
 * Avoids mfa.getAuthenticatorAssuranceLevel(), which reads session.user from getSession().
 */
export async function getMfaSessionState(
  supabase: SupabaseClient,
): Promise<MfaSessionState> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return EMPTY_MFA_STATE;

  const totpFactors = (user.factors ?? []).filter(
    (f) => f.factor_type === "totp",
  );
  const verified = totpFactors.filter((f) => f.status === "verified");
  const hasVerifiedTotp = verified.length > 0;
  const verifiedFactorId = verified[0]?.id ?? null;

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token ?? null;
  let currentLevel = "aal1";
  if (accessToken) {
    const payload = decodeAccessTokenPayload(accessToken);
    if (payload?.aal === "aal1" || payload?.aal === "aal2") {
      currentLevel = payload.aal;
    }
  }

  const nextLevel = hasVerifiedTotp ? "aal2" : currentLevel;
  const needsMfaVerification =
    hasVerifiedTotp && nextLevel === "aal2" && currentLevel !== "aal2";

  return {
    hasVerifiedTotp,
    verifiedFactorId,
    currentLevel,
    nextLevel,
    needsMfaVerification,
  };
}

/** Unverified TOTP factors from abandoned setup block new enrollments in Supabase. */
export async function removeUnverifiedTotpFactors(
  supabase: SupabaseClient,
): Promise<{ removed: string[]; errors: string[] }> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) {
    return { removed: [], errors: error ? [error.message] : [] };
  }

  const unverified = (data.all ?? []).filter(
    (f) => f.factor_type === "totp" && f.status === "unverified",
  );

  const removed: string[] = [];
  const errors: string[] = [];

  for (const factor of unverified) {
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId: factor.id,
    });
    if (unenrollError) {
      errors.push(unenrollError.message);
    } else {
      removed.push(factor.id);
    }
  }

  return { removed, errors };
}

/** Map Supabase enroll errors to safe user-facing copy (never expose secrets). */
export function mfaEnrollErrorMessage(message?: string): string {
  if (!message) {
    return "Could not start authenticator setup. Try again.";
  }

  const lower = message.toLowerCase();
  if (
    lower.includes("exceed") ||
    lower.includes("max") ||
    lower.includes("limit") ||
    lower.includes("unenroll")
  ) {
    return "A previous setup attempt is still pending. Wait a moment and try again.";
  }
  if (lower.includes("not enabled") || lower.includes("disabled")) {
    return "MFA is not enabled for this project. Enable TOTP in Supabase Auth settings.";
  }

  return "Could not start authenticator setup. Try again.";
}

/** Normalize Supabase TOTP QR output for use in `<img src>` (never log input). */
export function totpQrCodeDataUrl(qrCode: string): string {
  const trimmed = qrCode.trim();
  if (trimmed.startsWith("data:image/svg+xml")) {
    return trimmed;
  }
  if (trimmed.startsWith("<")) {
    return `data:image/svg+xml;utf-8,${encodeURIComponent(trimmed)}`;
  }
  return `data:image/svg+xml;utf-8,${trimmed}`;
}

import type { SupabaseClient } from "@supabase/supabase-js";

export type MfaSessionState = {
  hasVerifiedTotp: boolean;
  verifiedFactorId: string | null;
  currentLevel: string;
  nextLevel: string;
  /** User enrolled TOTP but this session is still AAL1 — needs MFA challenge. */
  needsMfaVerification: boolean;
};

/** Read Supabase MFA assurance level and verified TOTP factors (no secrets). */
export async function getMfaSessionState(
  supabase: SupabaseClient,
): Promise<MfaSessionState> {
  const [{ data: aalData }, { data: factorsData }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);

  const currentLevel = aalData?.currentLevel ?? "aal1";
  const nextLevel = aalData?.nextLevel ?? "aal1";

  const totpFactors = factorsData?.totp ?? [];
  const verified = totpFactors.filter((f) => f.status === "verified");
  const hasVerifiedTotp = verified.length > 0;
  const verifiedFactorId = verified[0]?.id ?? null;

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

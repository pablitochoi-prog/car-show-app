import { createHmac } from "crypto";

function phoneHashSecret(): string {
  const secret = process.env.SMS_PHONE_HASH_SECRET?.trim();
  if (!secret) {
    throw new Error("SMS_PHONE_HASH_SECRET is not configured");
  }
  return secret;
}

/** Normalize to digits with optional leading + for E.164-style hashing. */
export function normalizePhoneForHash(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

export function hashPhoneNumber(raw: string): string {
  const normalized = normalizePhoneForHash(raw);
  if (!normalized) {
    throw new Error("Cannot hash empty phone number");
  }
  return createHmac("sha256", phoneHashSecret())
    .update(normalized)
    .digest("hex");
}

/** Test-only helper when secret is injected via env in vitest setup. */
export function hashPhoneNumberWithSecret(raw: string, secret: string): string {
  const normalized = normalizePhoneForHash(raw);
  if (!normalized) throw new Error("Cannot hash empty phone number");
  return createHmac("sha256", secret).update(normalized).digest("hex");
}

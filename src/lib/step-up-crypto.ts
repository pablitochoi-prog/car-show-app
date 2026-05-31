import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEYLEN = 32;

function stepUpSecret(): string {
  const secret =
    process.env.STEP_UP_COOKIE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) {
    throw new Error("Missing STEP_UP_COOKIE_SECRET or SUPABASE_SERVICE_ROLE_KEY");
  }
  return secret;
}

/** Hash a 6-digit OTP for storage (never log the input). */
export function hashOtpCode(code: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(code, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyOtpCode(code: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const computed = scryptSync(code, salt, SCRYPT_KEYLEN);
    const expected = Buffer.from(hash, "hex");
    if (computed.length !== expected.length) return false;
    return timingSafeEqual(computed, expected);
  } catch {
    return false;
  }
}

export function generateOtpCode(): string {
  const n = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return n.toString().padStart(6, "0");
}

export type StepUpCookiePayload = {
  userId: string;
  sessionId: string;
  purpose: string;
  verifiedAt: number;
};

export function signStepUpCookie(payload: StepUpCookiePayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", stepUpSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyStepUpCookie(
  token: string | undefined | null,
): StepUpCookiePayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", stepUpSecret()).update(data).digest("base64url");
  if (sig.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8"),
    ) as StepUpCookiePayload;
    if (
      !parsed.userId ||
      !parsed.sessionId ||
      !parsed.purpose ||
      !parsed.verifiedAt
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function maskEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.indexOf("@");
  if (at <= 1) return "•••@•••";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const maskedLocal =
    local.length <= 2
      ? `${local[0] ?? ""}•`
      : `${local[0]}${"•".repeat(Math.min(local.length - 2, 4))}${local.slice(-1)}`;
  const dot = domain.lastIndexOf(".");
  if (dot <= 0) return `${maskedLocal}@${domain}`;
  const domainName = domain.slice(0, dot);
  const tld = domain.slice(dot);
  const maskedDomain =
    domainName.length <= 2
      ? `${domainName[0] ?? ""}•`
      : `${domainName[0]}••${domainName.slice(-1)}`;
  return `${maskedLocal}@${maskedDomain}${tld}`;
}

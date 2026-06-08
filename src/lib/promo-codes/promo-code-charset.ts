/** Characters allowed in manually entered promo codes (Phase 1+). */
export const PROMO_CODE_ALLOWED_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-!#$%";

export const PROMO_CODE_LENGTH = 16;

const ALLOWED_CHAR_SET = new Set(PROMO_CODE_ALLOWED_CHARS.split(""));

/** Phase 1 auto-generated codes use uppercase letters and digits only. */
export const PROMO_CODE_GENERATE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function isValidPromoCodeFormat(code: string): boolean {
  if (code.length !== PROMO_CODE_LENGTH) return false;
  for (const ch of code) {
    if (!ALLOWED_CHAR_SET.has(ch)) return false;
  }
  return true;
}

/**
 * Normalize organizer/admin input for lookup.
 * Trims whitespace, uppercases letters A–Z / a–z, preserves digits and specials.
 */
export function normalizePromoCodeInput(raw: string): string {
  const trimmed = raw.trim();
  return trimmed
    .split("")
    .map((ch) => {
      if (ch >= "a" && ch <= "z") return ch.toUpperCase();
      return ch;
    })
    .join("");
}

export const PROMO_CODE_FORMAT_HELP =
  "16 characters. Letters A–Z, digits 0–9, and _ - ! # $ %. Generated codes use uppercase A–Z and 0–9 only. Redemption is case-insensitive for letters.";

/** Minimal shape check for optional event contact email (non-empty must have @ and .). */

export const CONTACT_EMAIL_INVALID_MESSAGE =
  "Email must include @ and a dot (e.g. name@site.com).";

export function isOptionalContactEmailValid(value: string): boolean {
  const s = value.trim();
  if (s.length === 0) return true;
  return s.includes("@") && s.includes(".");
}

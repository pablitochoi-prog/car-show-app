/** Normalize user-entered website: adds https:// when no scheme (example.com → https://example.com/). */
export function normalizeWebsiteUrlForStorage(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.href;
  } catch {
    return undefined;
  }
}

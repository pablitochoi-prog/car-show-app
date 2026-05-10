/**
 * Seed first/last fields when only legacy `name` was stored.
 */
export function splitUserDisplayName(
  name: string,
  firstName: string | null | undefined,
  lastName: string | null | undefined
): { firstName: string; lastName: string } {
  const f = firstName?.trim();
  const l = lastName?.trim();
  if (f || l) {
    return { firstName: f ?? "", lastName: l ?? "" };
  }
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

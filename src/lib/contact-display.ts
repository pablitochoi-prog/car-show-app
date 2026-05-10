/** Split legacy single contactName into first/last when dedicated columns are empty. */
export function splitLegacyContact(
  first: string | null | undefined,
  last: string | null | undefined,
  full: string | null | undefined
): { first: string; last: string } {
  if (first?.trim() || last?.trim()) {
    return { first: first?.trim() ?? "", last: last?.trim() ?? "" };
  }
  if (!full?.trim()) return { first: "", last: "" };
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0]!, last: "" };
  return { first: parts[0]!, last: parts.slice(1).join(" ") };
}

export function displayContactName(
  first: string | null | undefined,
  last: string | null | undefined,
  full: string | null | undefined
): string {
  const joined = [first?.trim(), last?.trim()].filter(Boolean).join(" ").trim();
  if (joined) return joined;
  return full?.trim() ?? "";
}

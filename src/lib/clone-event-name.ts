/** Strip trailing " (N)" version suffix from an event name. */
export function cloneEventBaseName(name: string): string {
  const trimmed = name.trim();
  const match = trimmed.match(/^(.+?)\s+\((\d+)\)$/);
  return match ? match[1].trim() : trimmed;
}

/** Next cloned name, e.g. "Cruizin Classic Car show" → "Cruizin Classic Car show (2)". */
export function buildClonedEventName(
  sourceName: string,
  existingNames: string[],
): string {
  const base = cloneEventBaseName(sourceName);
  let maxVersion = 0;

  for (const existing of existingNames) {
    if (existing === base) {
      maxVersion = Math.max(maxVersion, 1);
      continue;
    }
    const match = existing.match(
      new RegExp(`^${escapeRegExp(base)}\\s+\\((\\d+)\\)$`),
    );
    if (match) {
      maxVersion = Math.max(maxVersion, Number.parseInt(match[1], 10));
    }
  }

  return `${base} (${maxVersion + 1})`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

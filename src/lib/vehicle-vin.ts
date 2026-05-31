/** Normalize VIN keyboard input (17 chars, no I/O/Q). */
export function normalizeVinInput(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-HJ-NPR-Z0-9]/g, "")
    .slice(0, 17);
}

/** Mask VIN for garage display — e.g. `XXX9186` from last four digits. */
export function formatVinMaskLastFour(vin: string | null | undefined): string | null {
  const normalized = normalizeVinInput(vin ?? "");
  if (normalized.length < 4) return null;
  return `XXX${normalized.slice(-4)}`;
}

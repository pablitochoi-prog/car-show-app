/** HTML `step` for `<input type="time">` / `datetime-local` time portion (5 minutes in seconds). */
export const TIME_FIVE_MINUTE_STEP_SECONDS = 300;

/** @deprecated Use {@link TIME_FIVE_MINUTE_STEP_SECONDS}. */
export const TIME_QUARTER_HOUR_STEP_SECONDS = TIME_FIVE_MINUTE_STEP_SECONDS;

const FIVE_MINUTE_VALUES = [
  0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55,
] as const;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Minute labels aligned with {@link normalizeTimeToFiveMinutes}. */
export const FIVE_MINUTE_OPTIONS: readonly string[] = FIVE_MINUTE_VALUES.map(
  (n) => pad2(n)
);

/** @deprecated Use {@link FIVE_MINUTE_OPTIONS}. */
export const QUARTER_MINUTE_OPTIONS = FIVE_MINUTE_OPTIONS;

/** Snap `HH:MM` or `HH:MM:SS` minutes to the nearest 5-minute mark. Empty stays empty. */
export function normalizeTimeToFiveMinutes(time: string): string {
  const t = time.trim();
  if (!t) return "";
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(t);
  if (!match) return t;
  let h = parseInt(match[1]!, 10);
  let m = parseInt(match[2]!, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  h = ((h % 24) + 24) % 24;
  m = Math.max(0, Math.min(59, m));
  let best = 0;
  let bestD = 999;
  for (const q of FIVE_MINUTE_VALUES) {
    const d = Math.abs(m - q);
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return `${pad2(h)}:${pad2(best)}`;
}

/** @deprecated Use {@link normalizeTimeToFiveMinutes}. */
export function normalizeTimeToQuarterHour(time: string): string {
  return normalizeTimeToFiveMinutes(time);
}

/**
 * Split `HH:MM` after five-minute normalization for pickers.
 * Empty input → hour `""`, minute `"00"` (minute UI defaults until an hour is chosen).
 */
export function parseFiveMinuteParts(time: string): {
  hour: string;
  minute: string;
} {
  const norm = normalizeTimeToFiveMinutes(time.trim());
  if (!norm) return { hour: "", minute: "00" };
  const [h, m] = norm.split(":");
  return { hour: h ?? "", minute: m ?? "00" };
}

/** @deprecated Use {@link parseFiveMinuteParts}. */
export function parseQuarterHourParts(time: string): {
  hour: string;
  minute: string;
} {
  return parseFiveMinuteParts(time);
}

/** Snap `YYYY-MM-DDTHH:MM` datetime-local string to five-minute steps. */
export function normalizeDatetimeLocalToFiveMinutes(local: string): string {
  if (!local?.trim()) return "";
  const idx = local.indexOf("T");
  if (idx === -1) return local;
  const datePart = local.slice(0, idx);
  const rest = local.slice(idx + 1);
  const hhmm = rest.slice(0, 5);
  const norm = normalizeTimeToFiveMinutes(hhmm);
  if (!norm) return `${datePart}T`;
  return `${datePart}T${norm}`;
}

/** @deprecated Use {@link normalizeDatetimeLocalToFiveMinutes}. */
export function normalizeDatetimeLocalToQuarterHour(local: string): string {
  return normalizeDatetimeLocalToFiveMinutes(local);
}

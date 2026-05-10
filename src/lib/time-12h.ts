import { normalizeTimeToFiveMinutes } from "@/lib/time-quarter-hour";

export type AmPm = "AM" | "PM";

/** Convert 24-hour clock hour (0–23) to 12-hour display + AM/PM. */
export function from24Hour(h: number): { h12: number; ampm: AmPm } {
  const hr = ((h % 24) + 24) % 24;
  if (hr === 0) return { h12: 12, ampm: "AM" };
  if (hr < 12) return { h12: hr, ampm: "AM" };
  if (hr === 12) return { h12: 12, ampm: "PM" };
  return { h12: hr - 12, ampm: "PM" };
}

/** Convert 12-hour component + AM/PM to 24-hour hour (0–23). `h12` is 1–12. */
export function to24Hour(h12: number, ampm: AmPm): number {
  if (ampm === "AM") return h12 === 12 ? 0 : h12;
  return h12 === 12 ? 12 : h12 + 12;
}

/** e.g. `"14:30"` → `"2:30 PM"` (after five-minute normalization). */
export function formatHhMmAs12hLabel(hhMm: string): string {
  const t = normalizeTimeToFiveMinutes(hhMm.trim());
  if (!t) return "";
  const [hs, ms] = t.split(":");
  const h = parseInt(hs!, 10);
  if (Number.isNaN(h)) return "";
  const { h12, ampm } = from24Hour(h);
  return `${h12}:${ms} ${ampm}`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Parse user-typed times such as `2:30 PM`, `14:30`, `02:30pm`.
 * Returns normalized `HH:MM`, empty string if cleared, or `null` if invalid.
 */
export function parseTypedTimeToHhMm(raw: string): string | null {
  const s = raw.trim();
  if (!s) return "";

  let rest = s.replace(/\s+/g, " ").trim();
  let ampm: AmPm | null = null;
  const pmMatch = /\b(p\.?m\.?|pm)\s*$/i.exec(rest);
  const amMatch = /\b(a\.?m\.?|am)\s*$/i.exec(rest);
  if (pmMatch && amMatch) return null;
  if (pmMatch) {
    ampm = "PM";
    rest = rest.slice(0, pmMatch.index).trim();
  } else if (amMatch) {
    ampm = "AM";
    rest = rest.slice(0, amMatch.index).trim();
  }

  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(rest);
  if (!timeMatch) return null;
  const h = parseInt(timeMatch[1]!, 10);
  const min = parseInt(timeMatch[2]!, 10);
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  if (min < 0 || min > 59) return null;

  if (ampm != null) {
    if (h < 1 || h > 12) return null;
    const h24 = to24Hour(h, ampm);
    return normalizeTimeToFiveMinutes(`${pad2(h24)}:${pad2(min)}`);
  }

  if (h > 23 || h < 0) return null;
  return normalizeTimeToFiveMinutes(`${pad2(h)}:${pad2(min)}`);
}

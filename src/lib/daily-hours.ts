/** Per-day hours saved as JSON on Event for multi-day events with varying times. */

import {
  DEFAULT_EVENT_TIME_ZONE,
  isEventTimeZoneIana,
  type EventTimeZoneIana,
} from "@/lib/event-time-zones";

export type DailyHourRow = {
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  /** IANA zone id, e.g. America/Los_Angeles */
  timeZone?: string | null;
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  return null;
}

export function parseDailyHours(json: unknown): DailyHourRow[] | null {
  if (json == null) return null;
  if (!Array.isArray(json)) return null;
  const out: DailyHourRow[] = [];
  for (const item of json) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const date = typeof row.date === "string" ? row.date : "";
    if (!YMD.test(date)) continue;
    const tzRaw = strOrNull(row.timeZone);
    const timeZone: EventTimeZoneIana | null =
      tzRaw && isEventTimeZoneIana(tzRaw) ? tzRaw : null;
    out.push({
      date,
      startTime: strOrNull(row.startTime),
      endTime: strOrNull(row.endTime),
      timeZone,
    });
  }
  return out.length ? out : null;
}

export function normalizeDailyHours(rows: DailyHourRow[]): DailyHourRow[] {
  return [...rows]
    .filter((r) => YMD.test(r.date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      date: r.date,
      startTime: r.startTime ?? null,
      endTime: r.endTime ?? null,
      timeZone:
        r.timeZone && isEventTimeZoneIana(r.timeZone)
          ? r.timeZone
          : DEFAULT_EVENT_TIME_ZONE,
    }));
}

/** Calendar date as UTC noon to avoid TZ shifting the stored calendar day. */
export function utcDateFromYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1, 12, 0, 0));
}

export function addOneCalendarDay(ymd: string): string {
  const dt = utcDateFromYmd(ymd);
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

export function deriveFieldsFromDailyHours(rows: DailyHourRow[]) {
  const sorted = normalizeDailyHours(rows);
  if (sorted.length === 0) {
    throw new Error("Daily schedule must include at least one date");
  }
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  return {
    startDate: utcDateFromYmd(first.date),
    endDate: sorted.length > 1 ? utcDateFromYmd(last.date) : null,
    isMultiDay: sorted.length > 1,
    startTime: first.startTime?.trim() ? first.startTime : null,
    endTime: first.endTime?.trim() ? first.endTime : null,
    dailyHours: sorted,
  };
}

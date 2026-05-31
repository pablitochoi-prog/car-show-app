import { isYmdBeforeLocalToday, todayLocalYmd } from "@/lib/event-schedule-date";
import { utcDateFromYmd } from "@/lib/daily-hours";

/** True when an instant is at or before now (invalid for future-only scheduling). */
export function isInstantInPast(value: Date | string | null | undefined): boolean {
  if (value == null) return false;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() <= Date.now();
}

/** Clear past instants so cloned templates do not carry stale windows. */
export function nullIfInstantInPast(
  value: Date | null | undefined,
): Date | null {
  if (value == null) return null;
  return isInstantInPast(value) ? null : value;
}

export function validateTierWindowNotInPast(input: {
  opensAt?: Date | string | null | undefined;
  closesAt?: Date | string | null | undefined;
}): string | null {
  if (input.opensAt != null && isInstantInPast(input.opensAt)) {
    return "Registration tier open date cannot be in the past.";
  }
  if (input.closesAt != null && isInstantInPast(input.closesAt)) {
    return "Registration tier close date cannot be in the past.";
  }
  return null;
}

export function validateSmsVotingWindowNotInPast(input: {
  smsVotingEnabled: boolean;
  smsVotingStartsAt: Date | string | null | undefined;
  smsVotingEndsAt: Date | string | null | undefined;
}): string | null {
  if (!input.smsVotingEnabled) return null;
  if (input.smsVotingStartsAt != null && isInstantInPast(input.smsVotingStartsAt)) {
    return "SMS voting start must be in the future.";
  }
  if (input.smsVotingEndsAt != null && isInstantInPast(input.smsVotingEndsAt)) {
    return "SMS voting end must be in the future.";
  }
  return null;
}

type DailyHourRow = { date?: string | null };

/** Validate event schedule rows when listing goes live or is scheduled. */
export function validateEventScheduleDatesNotInPast(input: {
  dailyHours?: DailyHourRow[] | null;
  rainDate?: string | null;
}): string | null {
  const rows = input.dailyHours;
  if (rows?.length) {
    for (const row of rows) {
      const date = row.date?.trim();
      if (date && isYmdBeforeLocalToday(date)) {
        return "Event date cannot be in the past.";
      }
    }
  }
  const rain = input.rainDate?.trim();
  if (rain && isYmdBeforeLocalToday(rain)) {
    return "Rain date cannot be in the past.";
  }
  return null;
}

/** Clear past calendar-day dates (Event.endDate, rainDate, etc.). */
export function nullIfCalendarDateInPast(
  value: Date | null | undefined,
): Date | null {
  if (value == null) return null;
  const ymd = value.toISOString().slice(0, 10);
  return isYmdBeforeLocalToday(ymd) ? null : value;
}

/** Required event start date on clone — falls back to today when the source date is past. */
export function cloneEventStartDate(
  value: Date | null | undefined,
): Date {
  const kept = nullIfCalendarDateInPast(value);
  return kept ?? utcDateFromYmd(todayLocalYmd());
}

/** Strip past calendar dates from cloned dailyHours so organizers set fresh dates. */
export function sanitizeDailyHoursPastDates(
  dailyHours: unknown,
): PrismaJsonDailyHours | undefined {
  if (!Array.isArray(dailyHours)) return undefined;
  return dailyHours.map((row) => {
    if (row == null || typeof row !== "object") return row;
    const r = row as DailyHourRow & Record<string, unknown>;
    const date = typeof r.date === "string" ? r.date.trim() : "";
    if (date && isYmdBeforeLocalToday(date)) {
      return { ...r, date: "" };
    }
    return r;
  }) as PrismaJsonDailyHours;
}

type PrismaJsonDailyHours = Record<string, unknown>[];

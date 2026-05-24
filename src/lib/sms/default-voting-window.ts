import { normalizeDailyHours, type DailyHourRow } from "@/lib/daily-hours";
import {
  normalizeDatetimeLocalToFiveMinutes,
  normalizeTimeToFiveMinutes,
} from "@/lib/time-quarter-hour";

export type EventScheduleForSmsDefaults = {
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  dailyHours?: DailyHourRow[] | null;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Match event form calendar extraction from stored ISO dates. */
function toDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function buildDatetimeLocal(dateYmd: string, timeHhMm: string): string {
  const date = dateYmd.trim();
  const time = normalizeTimeToFiveMinutes(timeHhMm.trim() || "00:00");
  if (!date) return "";
  if (!time) return `${date}T`;
  return normalizeDatetimeLocalToFiveMinutes(`${date}T${time}`);
}

function dateToDatetimeLocal(d: Date): string {
  const raw = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return normalizeDatetimeLocalToFiveMinutes(raw);
}

function subtractHoursFromDatetimeLocal(local: string, hours: number): string {
  if (!local.trim()) return "";
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return "";
  d.setTime(d.getTime() - hours * 60 * 60 * 1000);
  return dateToDatetimeLocal(d);
}

function resolveScheduleBounds(schedule: EventScheduleForSmsDefaults): {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
} {
  const normalizedDaily = schedule.dailyHours?.length
    ? normalizeDailyHours(schedule.dailyHours)
    : null;

  if (normalizedDaily?.length) {
    const first = normalizedDaily[0]!;
    const last = normalizedDaily[normalizedDaily.length - 1]!;
    const startTime =
      normalizeTimeToFiveMinutes(first.startTime ?? "") || "00:00";
    const endTime =
      normalizeTimeToFiveMinutes(last.endTime ?? "") ||
      normalizeTimeToFiveMinutes(last.startTime ?? "") ||
      normalizeTimeToFiveMinutes(first.endTime ?? "") ||
      startTime;
    return {
      startDate: first.date,
      startTime,
      endDate: last.date,
      endTime,
    };
  }

  const startDate = toDateInput(schedule.startDate);
  const endDate = schedule.endDate
    ? toDateInput(schedule.endDate)
    : startDate;
  const startTime =
    normalizeTimeToFiveMinutes(schedule.startTime ?? "") || "00:00";
  const endTime =
    normalizeTimeToFiveMinutes(schedule.endTime ?? "") ||
    normalizeTimeToFiveMinutes(schedule.startTime ?? "") ||
    startTime;

  return { startDate, startTime, endDate, endTime };
}

/** Default SMS voting opens at the event start date/time (`datetime-local`). */
export function defaultSmsVotingOpensLocal(
  schedule: EventScheduleForSmsDefaults,
): string {
  const bounds = resolveScheduleBounds(schedule);
  return buildDatetimeLocal(bounds.startDate, bounds.startTime);
}

/** Default SMS voting closes two hours before the event end date/time. */
export function defaultSmsVotingEndsLocal(
  schedule: EventScheduleForSmsDefaults,
): string {
  const bounds = resolveScheduleBounds(schedule);
  const eventEnd = buildDatetimeLocal(bounds.endDate, bounds.endTime);
  return subtractHoursFromDatetimeLocal(eventEnd, 2);
}

export function defaultSmsVotingWindowLocal(schedule: EventScheduleForSmsDefaults): {
  opens: string;
  closes: string;
} {
  return {
    opens: defaultSmsVotingOpensLocal(schedule),
    closes: defaultSmsVotingEndsLocal(schedule),
  };
}

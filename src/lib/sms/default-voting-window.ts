import {
  utcInstantToZonedLocal,
  zonedLocalDateTimeToUtc,
} from "@/lib/event-calendar";
import { normalizeDailyHours, type DailyHourRow } from "@/lib/daily-hours";
import {
  isEventTimeZoneIana,
  type EventTimeZoneIana,
} from "@/lib/event-time-zones";
import { normalizeTimeToFiveMinutes } from "@/lib/time-quarter-hour";
import { timeZoneForUsState } from "@/lib/us-state-time-zone";

export type EventScheduleForSmsDefaults = {
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  dailyHours?: DailyHourRow[] | null;
  /** Venue state — used for time zone when daily hours omit one. */
  venueState?: string | null;
};

export type ZonedLocalDateTime = {
  date: string;
  time: string;
};

/** Match event form calendar extraction from stored ISO dates. */
function toDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
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

export function resolveEventScheduleTimeZone(
  schedule: EventScheduleForSmsDefaults,
): EventTimeZoneIana {
  const normalizedDaily = schedule.dailyHours?.length
    ? normalizeDailyHours(schedule.dailyHours)
    : null;
  const tz = normalizedDaily?.[0]?.timeZone;
  if (tz && isEventTimeZoneIana(tz)) return tz;
  return timeZoneForUsState(schedule.venueState);
}

/** Default SMS voting opens at the event start date/time in the event zone. */
export function defaultSmsVotingOpens(
  schedule: EventScheduleForSmsDefaults,
): ZonedLocalDateTime {
  const bounds = resolveScheduleBounds(schedule);
  return { date: bounds.startDate, time: bounds.startTime };
}

/** Default SMS voting closes two hours before the event end in the event zone. */
export function defaultSmsVotingEnds(
  schedule: EventScheduleForSmsDefaults,
): ZonedLocalDateTime {
  const bounds = resolveScheduleBounds(schedule);
  const timeZone = resolveEventScheduleTimeZone(schedule);
  const endUtc = zonedLocalDateTimeToUtc(
    bounds.endDate,
    bounds.endTime,
    timeZone,
  );
  const closeUtc = new Date(endUtc.getTime() - 2 * 60 * 60 * 1000);
  return utcInstantToZonedLocal(closeUtc, timeZone);
}

export function defaultSmsVotingWindow(schedule: EventScheduleForSmsDefaults): {
  opens: ZonedLocalDateTime;
  closes: ZonedLocalDateTime;
} {
  return {
    opens: defaultSmsVotingOpens(schedule),
    closes: defaultSmsVotingEnds(schedule),
  };
}

/** @deprecated Use {@link defaultSmsVotingOpens} — returns `YYYY-MM-DDTHH:MM` without zone conversion. */
export function defaultSmsVotingOpensLocal(
  schedule: EventScheduleForSmsDefaults,
): string {
  const { date, time } = defaultSmsVotingOpens(schedule);
  return date && time ? `${date}T${time}` : "";
}

/** @deprecated Use {@link defaultSmsVotingEnds} */
export function defaultSmsVotingEndsLocal(
  schedule: EventScheduleForSmsDefaults,
): string {
  const { date, time } = defaultSmsVotingEnds(schedule);
  return date && time ? `${date}T${time}` : "";
}

/** @deprecated Use {@link defaultSmsVotingWindow} */
export function defaultSmsVotingWindowLocal(
  schedule: EventScheduleForSmsDefaults,
): { opens: string; closes: string } {
  const window = defaultSmsVotingWindow(schedule);
  return {
    opens:
      window.opens.date && window.opens.time
        ? `${window.opens.date}T${window.opens.time}`
        : "",
    closes:
      window.closes.date && window.closes.time
        ? `${window.closes.date}T${window.closes.time}`
        : "",
  };
}

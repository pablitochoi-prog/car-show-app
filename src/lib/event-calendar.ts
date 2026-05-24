import { parseDailyHours } from "@/lib/daily-hours";
import {
  DEFAULT_EVENT_TIME_ZONE,
  isEventTimeZoneIana,
  type EventTimeZoneIana,
} from "@/lib/event-time-zones";
import { formatEventShowNumber } from "@/lib/event-show-number";
import { normalizeTimeToFiveMinutes } from "@/lib/time-quarter-hour";

export type EventCalendarInput = {
  eventId: string;
  name: string;
  showNumber: number;
  description?: string | null;
  venue?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  startDate: Date;
  endDate?: Date | null;
  startTime?: string | null;
  endTime?: string | null;
  dailyHours?: unknown;
  eventWebsite?: string | null;
};

export type CalendarEventDetails = {
  title: string;
  description: string;
  location: string;
  timeZone: EventTimeZoneIana;
  allDay: boolean;
  startYmd: string;
  endYmd: string;
  startTime: string | null;
  endTime: string | null;
  startUtc: Date;
  endUtc: Date;
};

export type AddToCalendarLinks = {
  googleUrl: string;
  outlookUrl: string;
  icsUrl: string;
};

function ymdFromUtcDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseHhMm(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  return normalizeTimeToFiveMinutes(raw.trim());
}

function resolveTimeZone(input: EventCalendarInput): EventTimeZoneIana {
  const rows = parseDailyHours(input.dailyHours);
  const tz = rows?.[0]?.timeZone;
  if (tz && isEventTimeZoneIana(tz)) return tz;
  return DEFAULT_EVENT_TIME_ZONE;
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);
  const hour = get("hour");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: hour === 24 ? 0 : hour,
    minute: get("minute"),
  };
}

/** Map wall-clock date/time in an IANA zone to a UTC instant. */
export function zonedLocalDateTimeToUtc(
  ymd: string,
  hhMm: string,
  timeZone: EventTimeZoneIana,
): Date {
  const normalized = parseHhMm(hhMm);
  if (!normalized) throw new Error("Invalid time");
  const [year, month, day] = ymd.split("-").map(Number);
  const [hour, minute] = normalized.split(":").map(Number);

  let guess = Date.UTC(year!, month! - 1, day!, hour!, minute!, 0);

  for (let attempt = 0; attempt < 6; attempt++) {
    const parts = getZonedParts(new Date(guess), timeZone);
    if (
      parts.year === year &&
      parts.month === month &&
      parts.day === day &&
      parts.hour === hour &&
      parts.minute === minute
    ) {
      return new Date(guess);
    }

    const targetUtc = Date.UTC(year!, month! - 1, day!, hour!, minute!, 0);
    const actualUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      0,
    );
    guess += targetUtc - actualUtc;
  }

  return new Date(guess);
}

function addDaysToYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d! + days, 12, 0, 0));
  return ymdFromUtcDate(dt);
}

function formatCalendarLocation(input: EventCalendarInput): string {
  const line1 = [input.venue, input.street].filter(Boolean).join(", ");
  const line2 = [input.city, input.state, input.zip].filter(Boolean).join(", ");
  return [line1, line2].filter(Boolean).join(", ");
}

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
}

function buildDescription(input: EventCalendarInput): string {
  const lines = [
    input.description?.trim() || null,
    `Event page: ${appBaseUrl()}/events/${input.eventId}`,
    input.eventWebsite?.trim() ? `Website: ${input.eventWebsite.trim()}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export function buildCalendarEventDetails(
  input: EventCalendarInput,
): CalendarEventDetails {
  const timeZone = resolveTimeZone(input);
  const startYmd = ymdFromUtcDate(input.startDate);
  const endYmd = ymdFromUtcDate(input.endDate ?? input.startDate);
  const startTime = parseHhMm(input.startTime);
  const endTime = parseHhMm(input.endTime);
  const allDay = !startTime;

  let startUtc: Date;
  let endUtc: Date;

  if (allDay) {
    startUtc = zonedLocalDateTimeToUtc(startYmd, "00:00", timeZone);
    const exclusiveEndYmd = addDaysToYmd(endYmd, 1);
    endUtc = zonedLocalDateTimeToUtc(exclusiveEndYmd, "00:00", timeZone);
  } else {
    startUtc = zonedLocalDateTimeToUtc(startYmd, startTime!, timeZone);
    if (endTime) {
      endUtc = zonedLocalDateTimeToUtc(endYmd, endTime, timeZone);
    } else {
      endUtc = new Date(startUtc.getTime() + 4 * 60 * 60 * 1000);
    }
    if (endUtc.getTime() <= startUtc.getTime()) {
      endUtc = new Date(startUtc.getTime() + 60 * 60 * 1000);
    }
  }

  return {
    title: `${formatEventShowNumber(input.showNumber)} ${input.name}`,
    description: buildDescription(input),
    location: formatCalendarLocation(input),
    timeZone,
    allDay,
    startYmd,
    endYmd,
    startTime,
    endTime,
    startUtc,
    endUtc,
  };
}

function formatUtcForGoogle(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function formatIsoForOutlook(d: Date): string {
  return d.toISOString();
}

export function buildGoogleCalendarUrl(details: CalendarEventDetails): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: details.title,
    details: details.description,
    location: details.location,
  });

  if (details.allDay) {
    const start = details.startYmd.replace(/-/g, "");
    const end = addDaysToYmd(details.endYmd, 1).replace(/-/g, "");
    params.set("dates", `${start}/${end}`);
  } else {
    params.set(
      "dates",
      `${formatUtcForGoogle(details.startUtc)}/${formatUtcForGoogle(details.endUtc)}`,
    );
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildOutlookCalendarUrl(details: CalendarEventDetails): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: details.title,
    body: details.description,
    location: details.location,
  });

  if (details.allDay) {
    params.set("startdt", `${details.startYmd}T00:00:00`);
    params.set("enddt", `${addDaysToYmd(details.endYmd, 1)}T00:00:00`);
    params.set("allday", "true");
  } else {
    params.set("startdt", formatIsoForOutlook(details.startUtc));
    params.set("enddt", formatIsoForOutlook(details.endUtc));
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatIcsTimestamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function formatIcsLocalDateTime(ymd: string, hhMm: string): string {
  return `${ymd.replace(/-/g, "")}T${hhMm.replace(":", "")}00`;
}

export function buildIcsContent(
  details: CalendarEventDetails,
  uid: string,
): string {
  const now = formatIcsTimestamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CarShowScout//Event Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(uid)}`,
    `DTSTAMP:${now}`,
    `SUMMARY:${escapeIcsText(details.title)}`,
  ];

  if (details.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(details.description)}`);
  }
  if (details.location) {
    lines.push(`LOCATION:${escapeIcsText(details.location)}`);
  }

  if (details.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${details.startYmd.replace(/-/g, "")}`);
    lines.push(
      `DTEND;VALUE=DATE:${addDaysToYmd(details.endYmd, 1).replace(/-/g, "")}`,
    );
  } else {
    lines.push(
      `DTSTART;TZID=${details.timeZone}:${formatIcsLocalDateTime(details.startYmd, details.startTime!)}`,
    );
    const endYmd = details.endTime ? details.endYmd : ymdFromUtcDate(details.endUtc);
    const endHhMm = details.endTime
      ? details.endTime
      : (() => {
          const endParts = getZonedParts(details.endUtc, details.timeZone);
          return `${String(endParts.hour).padStart(2, "0")}:${String(endParts.minute).padStart(2, "0")}`;
        })();
    lines.push(
      `DTEND;TZID=${details.timeZone}:${formatIcsLocalDateTime(endYmd, endHhMm)}`,
    );
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

export function buildAddToCalendarLinks(
  input: EventCalendarInput,
): AddToCalendarLinks {
  const details = buildCalendarEventDetails(input);
  return {
    googleUrl: buildGoogleCalendarUrl(details),
    outlookUrl: buildOutlookCalendarUrl(details),
    icsUrl: `${appBaseUrl()}/api/events/${input.eventId}/calendar`,
  };
}

export function buildIcsForEvent(input: EventCalendarInput): {
  filename: string;
  content: string;
} {
  const details = buildCalendarEventDetails(input);
  const safeName = details.title
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return {
    filename: `${safeName || "event"}.ics`,
    content: buildIcsContent(details, `${input.eventId}@carshowscout`),
  };
}

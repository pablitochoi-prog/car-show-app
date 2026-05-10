/** US zones for event schedule rows (stored as IANA IDs in `dailyHours` JSON). */

export const EVENT_TIME_ZONE_OPTIONS = [
  { label: "Pacific", value: "America/Los_Angeles" },
  { label: "Mountain", value: "America/Denver" },
  { label: "Central", value: "America/Chicago" },
  { label: "Eastern", value: "America/New_York" },
  { label: "Alaska", value: "America/Anchorage" },
  { label: "Hawaii", value: "Pacific/Honolulu" },
] as const;

export const EVENT_TIME_ZONE_IANA = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Anchorage",
  "Pacific/Honolulu",
] as const;

export type EventTimeZoneIana = (typeof EVENT_TIME_ZONE_IANA)[number];

export const DEFAULT_EVENT_TIME_ZONE: EventTimeZoneIana = "America/Los_Angeles";

export function isEventTimeZoneIana(v: string | null | undefined): v is EventTimeZoneIana {
  return EVENT_TIME_ZONE_IANA.includes(v as EventTimeZoneIana);
}

export function eventTimeZoneLabel(
  iana: string | null | undefined
): string | null {
  if (!iana) return null;
  const row = EVENT_TIME_ZONE_OPTIONS.find((z) => z.value === iana);
  return row?.label ?? null;
}

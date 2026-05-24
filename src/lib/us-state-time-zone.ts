import {
  DEFAULT_EVENT_TIME_ZONE,
  type EventTimeZoneIana,
} from "@/lib/event-time-zones";

/**
 * Primary US time zone for each state/DC postal code.
 * Split states use the zone that covers most of the population.
 */
const US_STATE_TIME_ZONE: Record<string, EventTimeZoneIana> = {
  AL: "America/Chicago",
  AK: "America/Anchorage",
  AZ: "America/Denver",
  AR: "America/Chicago",
  CA: "America/Los_Angeles",
  CO: "America/Denver",
  CT: "America/New_York",
  DE: "America/New_York",
  DC: "America/New_York",
  FL: "America/New_York",
  GA: "America/New_York",
  HI: "Pacific/Honolulu",
  ID: "America/Denver",
  IL: "America/Chicago",
  IN: "America/New_York",
  IA: "America/Chicago",
  KS: "America/Chicago",
  KY: "America/New_York",
  LA: "America/Chicago",
  ME: "America/New_York",
  MD: "America/New_York",
  MA: "America/New_York",
  MI: "America/New_York",
  MN: "America/Chicago",
  MS: "America/Chicago",
  MO: "America/Chicago",
  MT: "America/Denver",
  NE: "America/Chicago",
  NV: "America/Los_Angeles",
  NH: "America/New_York",
  NJ: "America/New_York",
  NM: "America/Denver",
  NY: "America/New_York",
  NC: "America/New_York",
  ND: "America/Chicago",
  OH: "America/New_York",
  OK: "America/Chicago",
  OR: "America/Los_Angeles",
  PA: "America/New_York",
  RI: "America/New_York",
  SC: "America/New_York",
  SD: "America/Chicago",
  TN: "America/Chicago",
  TX: "America/Chicago",
  UT: "America/Denver",
  VT: "America/New_York",
  VA: "America/New_York",
  WA: "America/Los_Angeles",
  WV: "America/New_York",
  WI: "America/Chicago",
  WY: "America/Denver",
};

export function timeZoneForUsState(
  stateCode: string | null | undefined
): EventTimeZoneIana {
  const code = stateCode?.trim().toUpperCase();
  if (!code || code.length !== 2) return DEFAULT_EVENT_TIME_ZONE;
  return US_STATE_TIME_ZONE[code] ?? DEFAULT_EVENT_TIME_ZONE;
}

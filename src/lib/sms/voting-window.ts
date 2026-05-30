import type { EventStatus } from "@prisma/client";
import {
  DEFAULT_EVENT_TIME_ZONE,
  type EventTimeZoneIana,
} from "@/lib/event-time-zones";

const SMS_VOTING_EVENT_STATUSES: EventStatus[] = [
  "PUBLISHED",
  "ACTIVE",
  "VOTING",
];

export type SmsVotingEventSettings = {
  smsVotingEnabled: boolean;
  smsVotingStartsAt: Date | null;
  smsVotingEndsAt: Date | null;
  status: EventStatus;
};

export type SmsVotingWindowStatus = "open" | "not_started" | "ended" | "closed";

export const MSG_SMS_VOTING_NOT_OPEN =
  "SMS voting is not open for this event.";

export function getSmsVotingWindowStatus(
  event: SmsVotingEventSettings,
  now: Date = new Date(),
): SmsVotingWindowStatus {
  if (!event.smsVotingEnabled) return "closed";
  if (!SMS_VOTING_EVENT_STATUSES.includes(event.status)) return "closed";
  if (event.smsVotingStartsAt && now < event.smsVotingStartsAt) {
    return "not_started";
  }
  if (event.smsVotingEndsAt && now > event.smsVotingEndsAt) return "ended";
  return "open";
}

export function isSmsVotingOpenForEvent(
  event: SmsVotingEventSettings,
  now: Date = new Date(),
): boolean {
  return getSmsVotingWindowStatus(event, now) === "open";
}

/** Human-readable public voting window date/time for SMS replies. */
export function formatSmsVotingWindowDateTime(
  date: Date,
  timeZone: EventTimeZoneIana = DEFAULT_EVENT_TIME_ZONE,
): string {
  return date.toLocaleString("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}

export function buildSmsVotingWindowClosedMessage(
  event: SmsVotingEventSettings,
  now: Date = new Date(),
  timeZone: EventTimeZoneIana = DEFAULT_EVENT_TIME_ZONE,
): string {
  const status = getSmsVotingWindowStatus(event, now);
  if (status === "not_started" && event.smsVotingStartsAt) {
    return `The voting window for this event has not opened. Voting starts on ${formatSmsVotingWindowDateTime(event.smsVotingStartsAt, timeZone)}.`;
  }
  if (status === "ended" && event.smsVotingEndsAt) {
    return `The voting window for this event ended on ${formatSmsVotingWindowDateTime(event.smsVotingEndsAt, timeZone)}.`;
  }
  return MSG_SMS_VOTING_NOT_OPEN;
}

export function isCategoryVotingOpen(
  category: {
    isActive: boolean;
    votingStartsAt: Date | null;
    votingEndsAt: Date | null;
  },
  eventOpen: boolean,
  now: Date = new Date(),
): boolean {
  if (!eventOpen || !category.isActive) return false;
  if (category.votingStartsAt && now < category.votingStartsAt) return false;
  if (category.votingEndsAt && now > category.votingEndsAt) return false;
  return true;
}

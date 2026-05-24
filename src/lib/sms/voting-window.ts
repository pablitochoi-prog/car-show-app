import type { EventStatus } from "@prisma/client";

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

export function isSmsVotingOpenForEvent(
  event: SmsVotingEventSettings,
  now: Date = new Date(),
): boolean {
  if (!event.smsVotingEnabled) return false;
  if (!SMS_VOTING_EVENT_STATUSES.includes(event.status)) return false;
  if (event.smsVotingStartsAt && now < event.smsVotingStartsAt) return false;
  if (event.smsVotingEndsAt && now > event.smsVotingEndsAt) return false;
  return true;
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

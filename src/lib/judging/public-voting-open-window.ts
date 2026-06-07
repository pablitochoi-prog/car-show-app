const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const ONE_DAY_EIGHT_HOURS_MS = (24 + 8) * 60 * 60 * 1000;

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** SMS window dates when an organizer opens or reopens public voting. */
export function resolvePublicVotingOpenWindow(
  now: Date,
  smsVotingStartsAt: Date | null,
  smsVotingEndsAt: Date | null,
): { startsAt: Date; endsAt: Date } {
  if (smsVotingEndsAt && smsVotingEndsAt < now) {
    return {
      startsAt: new Date(now.getTime() - THIRTY_MINUTES_MS),
      endsAt: new Date(now.getTime() + ONE_DAY_EIGHT_HOURS_MS),
    };
  }
  if (smsVotingStartsAt && smsVotingStartsAt > now) {
    return {
      startsAt: new Date(now.getTime() - THIRTY_MINUTES_MS),
      endsAt:
        smsVotingEndsAt && smsVotingEndsAt > now
          ? smsVotingEndsAt
          : addDays(now, 1),
    };
  }
  return {
    startsAt:
      smsVotingStartsAt ?? new Date(now.getTime() - THIRTY_MINUTES_MS),
    endsAt:
      smsVotingEndsAt && smsVotingEndsAt > now
        ? smsVotingEndsAt
        : addDays(now, 1),
  };
}

/** Awards that are always public vote (never judge graded) when used at an event. */
export const LOCKED_PUBLIC_VOTE_AWARD_NAMES = [
  "People's Choice",
  "Kid's Choice",
] as const;

export function isLockedPublicVoteAward(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return LOCKED_PUBLIC_VOTE_AWARD_NAMES.some(
    (n) => n.toLowerCase() === normalized,
  );
}

export function isPublicVoteAward(
  name: string,
  smsVotingEligible: boolean,
): boolean {
  return isLockedPublicVoteAward(name) || smsVotingEligible;
}

export function publicVoteAwardLabel(
  name: string,
  smsVotingEligible: boolean,
): "Public vote" | "Judge graded" {
  return isPublicVoteAward(name, smsVotingEligible)
    ? "Public vote"
    : "Judge graded";
}

/** Hours after finalize before awards appear on owner vehicles (ceremony buffer). */
export const MY_AWARDS_CEREMONY_DELAY_MS = 24 * 60 * 60 * 1000;

export function awardsVisibleToOwnerAt(finalizedAt: Date): Date {
  return new Date(finalizedAt.getTime() + MY_AWARDS_CEREMONY_DELAY_MS);
}

export function isEventAwardsVisibleToOwners(
  finalizedAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!finalizedAt) return false;
  return awardsVisibleToOwnerAt(finalizedAt) <= now;
}

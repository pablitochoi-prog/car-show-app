import type { EventPlatformFeeMode } from "@/lib/event-platform-fee";

/** Event statuses where registration is open to the public. */
export const REGISTRATION_LIVE_STATUSES = ["PUBLISHED", "ACTIVE"] as const;

export type PlatformFeeModeLockInput = {
  status: string;
  platformFeeMode: EventPlatformFeeMode;
  platformSetupFeeCollected: boolean;
  nextMode?: EventPlatformFeeMode;
};

export function isPlatformFeeModeLocked(input: {
  status: string;
  platformSetupFeeCollected: boolean;
}): boolean {
  if (input.platformSetupFeeCollected) return true;
  return REGISTRATION_LIVE_STATUSES.includes(
    input.status as (typeof REGISTRATION_LIVE_STATUSES)[number],
  );
}

export function platformFeeModeLockReason(input: {
  status: string;
  platformSetupFeeCollected: boolean;
}): string | null {
  if (input.platformSetupFeeCollected) {
    return "The flat platform fee has been paid for this event. The billing option can no longer be changed.";
  }
  if (
    REGISTRATION_LIVE_STATUSES.includes(
      input.status as (typeof REGISTRATION_LIVE_STATUSES)[number],
    )
  ) {
    return "This event is live for registration. The platform fee billing option was locked when the event was published and cannot be changed.";
  }
  return null;
}

/** Validates whether the organizer may save a new platform fee mode. */
export function validatePlatformFeeModeChange(
  input: PlatformFeeModeLockInput,
): string | null {
  const lockReason = platformFeeModeLockReason(input);
  if (!lockReason) return null;

  if (input.nextMode != null && input.nextMode !== input.platformFeeMode) {
    return lockReason;
  }

  return null;
}

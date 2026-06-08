/** Email OTP step-up for event staff accessing sensitive management areas. */
export const STEP_UP_OTP_LENGTH = 6;

export const STEP_UP_OTP_EXPIRY_MINUTES = 10;

export const STEP_UP_OTP_RESEND_COOLDOWN_SECONDS = 60;

export const STEP_UP_OTP_MAX_ATTEMPTS = 5;

export const STEP_UP_COOKIE_NAME = "css_step_up_organizer";

/** Lifetime of the signed step-up cookie. */
export const STEP_UP_MAX_AGE_SECONDS = 60 * 60 * 24;

/**
 * Server-side freshness window for the `verifiedAt` claim. Mirrors the cookie
 * max-age so a cookie whose client-side expiry was tampered/extended is still
 * rejected on the server (defense-in-depth, not reliant on the browser).
 */
export const STEP_UP_FRESHNESS_MS = STEP_UP_MAX_AGE_SECONDS * 1000;

export type StepUpPurpose = "ORGANIZER_STEP_UP";

export const STEP_UP_PURPOSE_ORGANIZER: StepUpPurpose = "ORGANIZER_STEP_UP";

export const ORGANIZER_OTP_REQUIRED_CODE = "ORGANIZER_OTP_REQUIRED";

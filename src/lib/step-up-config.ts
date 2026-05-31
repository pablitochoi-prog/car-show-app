/** Email OTP step-up for event staff accessing sensitive management areas. */
export const STEP_UP_OTP_LENGTH = 6;

export const STEP_UP_OTP_EXPIRY_MINUTES = 10;

export const STEP_UP_OTP_RESEND_COOLDOWN_SECONDS = 60;

export const STEP_UP_OTP_MAX_ATTEMPTS = 5;

export const STEP_UP_COOKIE_NAME = "css_step_up_organizer";

export type StepUpPurpose = "ORGANIZER_STEP_UP";

export const STEP_UP_PURPOSE_ORGANIZER: StepUpPurpose = "ORGANIZER_STEP_UP";

export const ORGANIZER_OTP_REQUIRED_CODE = "ORGANIZER_OTP_REQUIRED";

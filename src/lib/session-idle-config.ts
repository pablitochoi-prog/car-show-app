/** Idle session timeout for authenticated users (minutes). */
export const SESSION_IDLE_TIMEOUT_MINUTES = 60;

/** Show inactivity warning after this many minutes idle. */
export const SESSION_WARNING_MINUTES = 55;

/** Minutes before expiry when the warning modal appears. */
export const SESSION_WARNING_LEAD_MINUTES =
  SESSION_IDLE_TIMEOUT_MINUTES - SESSION_WARNING_MINUTES;

/** Stripe checkout pause — do not expire session while user is on Stripe (minutes). */
export const SESSION_STRIPE_PAUSE_MINUTES = 120;

/** Minimum interval between Prisma `lastActivityAt` writes (ms). */
export const SESSION_ACTIVITY_DB_THROTTLE_MS = 2 * 60 * 1000;

/** HttpOnly cookie storing last activity (Unix ms). */
export const SESSION_ACTIVITY_COOKIE = "css_last_activity";

/** Cookie container lifetime — idle enforcement uses the stored timestamp, not maxAge. */
export const SESSION_ACTIVITY_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** HttpOnly cookie pausing idle enforcement until Unix ms. */
export const SESSION_IDLE_PAUSE_COOKIE = "css_idle_paused_until";

/** Client localStorage / BroadcastChannel key for cross-tab sync. */
export const SESSION_ACTIVITY_STORAGE_KEY = "css_last_activity";

export const SESSION_ACTIVITY_CHANNEL = "css-session-activity";

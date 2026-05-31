/** Subtle UI click sound for buttons and interactive controls. */
export const BUTTON_CLICK_SOUND_SRC = "/sounds/ui-click.mp3";

/** Playback volume (0–1). Kept low so feedback stays unobtrusive. */
export const BUTTON_CLICK_SOUND_VOLUME = 0.2;

/**
 * Global toggle for UI click sounds.
 * Set `NEXT_PUBLIC_ENABLE_BUTTON_CLICK_SOUND=false` to disable in production.
 */
export const ENABLE_BUTTON_CLICK_SOUND =
  process.env.NEXT_PUBLIC_ENABLE_BUTTON_CLICK_SOUND !== "false";

/** Haptic pulse length in milliseconds (Android / supported browsers). */
export const BUTTON_HAPTIC_MS = 18;

/** How long the pressed visual state stays active (ms). */
export const BUTTON_PRESSED_MS = 120;

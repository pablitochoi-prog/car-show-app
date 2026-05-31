/** Elements that receive global press / hover / sound feedback. */
export const BUTTON_FEEDBACK_SELECTOR = [
  "button",
  "a[href]",
  '[role="button"]',
  'input[type="button"]',
  'input[type="submit"]',
  '[data-slot="button"]',
].join(",");

export const BUTTON_FEEDBACK_PRESSED_CLASS = "ui-button-pressed";

export function isButtonFeedbackDisabled(el: HTMLElement): boolean {
  if (el.matches(":disabled")) return true;
  if (el.getAttribute("aria-disabled") === "true") return true;
  if (el.classList.contains("disabled")) return true;
  if (el.closest('[aria-disabled="true"], .disabled, fieldset:disabled')) {
    return true;
  }
  return false;
}

export function findButtonFeedbackTarget(
  node: EventTarget | null,
): HTMLElement | null {
  if (!(node instanceof Element)) return null;

  const match = node.closest(BUTTON_FEEDBACK_SELECTOR);
  if (!(match instanceof HTMLElement)) return null;
  if (isButtonFeedbackDisabled(match)) return null;

  // Skip links with no meaningful href (shouldn't match a[href] anyway).
  if (match.tagName === "A") {
    const href = match.getAttribute("href");
    if (!href || href.trim() === "") return null;
  }

  return match;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

import { SESSION_ACTIVITY_STORAGE_KEY } from "@/lib/session-idle-config";

/** Clear cross-tab idle tracking after login/logout. */
export function clearSessionActivityLocalStorage(): void {
  try {
    localStorage.removeItem(SESSION_ACTIVITY_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

/** Pause idle enforcement before redirecting to Stripe checkout (best-effort). */
export async function pauseSessionForStripeCheckout(): Promise<void> {
  try {
    await fetch("/api/auth/session-activity/pause", {
      method: "POST",
      credentials: "same-origin",
    });
  } catch {
    // Checkout should proceed even if pause fails.
  }
}

/** Redirect to Stripe after pausing idle timeout for active checkout. */
export async function redirectToStripeCheckout(checkoutUrl: string): Promise<void> {
  await pauseSessionForStripeCheckout();
  window.location.href = checkoutUrl;
}

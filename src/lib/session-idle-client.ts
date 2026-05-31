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

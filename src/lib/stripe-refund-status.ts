/** True when Stripe reports the charge has been fully refunded. */
export function isFullStripeChargeRefund(charge: {
  amount: number;
  amount_refunded: number;
}): boolean {
  return charge.amount_refunded >= charge.amount;
}

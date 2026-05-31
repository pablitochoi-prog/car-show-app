export const BUYER_INQUIRIES_UNAVAILABLE_MESSAGE =
  "Owner is no longer accepting inquiries about this vehicle.";

export function buyerInquiryNoticeForListing(
  row: { enabled: boolean; sellerAcknowledgedAt: Date | null } | null,
  eventLabel?: string | null,
): string | null {
  if (!row?.sellerAcknowledgedAt) return null;
  if (!row.enabled) {
    return eventLabel
      ? `Owner is no longer accepting inquiries about this vehicle — ${eventLabel}`
      : BUYER_INQUIRIES_UNAVAILABLE_MESSAGE;
  }
  return null;
}

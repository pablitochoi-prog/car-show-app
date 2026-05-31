export const BELOW_OFFER_INQUIRY_MESSAGE =
  "Thank you for your interest. The owner is not accepting inquiries at that offer level.";

export const INQUIRIES_CLOSED_API_MESSAGE =
  "This vehicle is not accepting inquiries right now.";

export function inquiriesClosedPageMessage(eventLabel: string): string {
  return `Owner is no longer accepting inquiries about this vehicle — ${eventLabel}`;
}

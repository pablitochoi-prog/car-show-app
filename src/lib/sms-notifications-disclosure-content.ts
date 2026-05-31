/** Required TCPA phrases on first-time SMS consent surfaces (registration, profile details, buyer inquiry). */
export const SMS_FIRST_TIME_CONSENT_REQUIRED_PHRASES = [
  "Message frequency varies",
  "Message and data rates may apply",
  "Reply STOP to opt out",
  "HELP for help",
  "SMS consent is not required",
] as const;

export const SMS_CONSENT_LINK_LABELS = {
  terms: "Terms",
  privacyPolicy: "Privacy Policy",
} as const;

const FULL_BEFORE_LINKS =
  "By checking this box and providing your phone number, you agree to receive SMS messages from CarShowScout related to your event submission, registration, check-in, voting, buyer-interest inquiry, event updates, account notifications, and support responses. Message frequency varies. Message and data rates may apply. Reply STOP to opt out and HELP for help. SMS consent is not required as a condition of purchase or participation. See our ";

const FULL_BETWEEN_LINKS = " and ";

const FULL_AFTER_LINKS = ".";

const BUYER_INQUIRY_BEFORE_LINKS =
  "Message frequency varies. Message and data rates may apply. Reply STOP to opt out and HELP for help. SMS consent is not required as a condition of purchase or participation. See ";

const BUYER_INQUIRY_BETWEEN_LINKS = " and ";

const BUYER_INQUIRY_AFTER_LINKS = ".";

export const SMS_NOTIFICATIONS_FULL_DISCLOSURE = {
  beforeLinks: FULL_BEFORE_LINKS,
  betweenLinks: FULL_BETWEEN_LINKS,
  afterLinks: FULL_AFTER_LINKS,
} as const;

export const SMS_NOTIFICATIONS_BUYER_INQUIRY_DISCLOSURE = {
  beforeLinks: BUYER_INQUIRY_BEFORE_LINKS,
  betweenLinks: BUYER_INQUIRY_BETWEEN_LINKS,
  afterLinks: BUYER_INQUIRY_AFTER_LINKS,
} as const;

/** Plain text of the full registration/profile SMS disclosure (for compliance tests). */
export function getSmsFullDisclosurePlainText(): string {
  return (
    SMS_NOTIFICATIONS_FULL_DISCLOSURE.beforeLinks +
    SMS_CONSENT_LINK_LABELS.terms +
    SMS_NOTIFICATIONS_FULL_DISCLOSURE.betweenLinks +
    SMS_CONSENT_LINK_LABELS.privacyPolicy +
    SMS_NOTIFICATIONS_FULL_DISCLOSURE.afterLinks
  );
}

/** Plain text of the compact buyer-inquiry SMS disclosure (for compliance tests). */
export function getSmsBuyerInquiryDisclosurePlainText(): string {
  return (
    SMS_NOTIFICATIONS_BUYER_INQUIRY_DISCLOSURE.beforeLinks +
    SMS_CONSENT_LINK_LABELS.terms +
    SMS_NOTIFICATIONS_BUYER_INQUIRY_DISCLOSURE.betweenLinks +
    SMS_CONSENT_LINK_LABELS.privacyPolicy +
    SMS_NOTIFICATIONS_BUYER_INQUIRY_DISCLOSURE.afterLinks
  );
}

export function smsDisclosureIncludesRequiredPhrases(text: string): boolean {
  return SMS_FIRST_TIME_CONSENT_REQUIRED_PHRASES.every((phrase) =>
    text.includes(phrase),
  );
}

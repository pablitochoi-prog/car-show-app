import Link from "next/link";
import {
  SMS_CONSENT_LINK_LABELS,
  SMS_NOTIFICATIONS_FULL_DISCLOSURE,
} from "@/lib/sms-notifications-disclosure-content";

export const SMS_NOTIFICATIONS_TERMS_URL =
  "https://events.carshowscout.com/terms";
export const SMS_NOTIFICATIONS_PRIVACY_URL =
  "https://events.carshowscout.com/privacy";

/** Full TCPA consent disclosure with Terms and Privacy Policy links. */
export function SmsNotificationsOptInFullDisclosure() {
  return (
    <p className="text-sm leading-relaxed text-muted-foreground">
      {SMS_NOTIFICATIONS_FULL_DISCLOSURE.beforeLinks}
      <Link
        href={SMS_NOTIFICATIONS_TERMS_URL}
        className="font-medium text-primary underline-offset-4 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {SMS_CONSENT_LINK_LABELS.terms}
      </Link>
      {SMS_NOTIFICATIONS_FULL_DISCLOSURE.betweenLinks}
      <Link
        href={SMS_NOTIFICATIONS_PRIVACY_URL}
        className="font-medium text-primary underline-offset-4 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {SMS_CONSENT_LINK_LABELS.privacyPolicy}
      </Link>
      {SMS_NOTIFICATIONS_FULL_DISCLOSURE.afterLinks}
    </p>
  );
}

import Link from "next/link";
import {
  SMS_CONSENT_LINK_LABELS,
  SMS_NOTIFICATIONS_BUYER_INQUIRY_DISCLOSURE,
} from "@/lib/sms-notifications-disclosure-content";
import {
  SMS_NOTIFICATIONS_PRIVACY_URL,
  SMS_NOTIFICATIONS_TERMS_URL,
} from "@/components/sms/sms-notifications-opt-in-disclosure";

/** Compact buyer-inquiry SMS consent (registration dialog). */
export function SmsNotificationsBuyerInquiryOptInDisclosure() {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      {SMS_NOTIFICATIONS_BUYER_INQUIRY_DISCLOSURE.beforeLinks}
      <Link
        href={SMS_NOTIFICATIONS_TERMS_URL}
        className="font-medium text-primary underline-offset-4 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {SMS_CONSENT_LINK_LABELS.terms}
      </Link>
      {SMS_NOTIFICATIONS_BUYER_INQUIRY_DISCLOSURE.betweenLinks}
      <Link
        href={SMS_NOTIFICATIONS_PRIVACY_URL}
        className="font-medium text-primary underline-offset-4 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {SMS_CONSENT_LINK_LABELS.privacyPolicy}
      </Link>
      {SMS_NOTIFICATIONS_BUYER_INQUIRY_DISCLOSURE.afterLinks}
    </p>
  );
}

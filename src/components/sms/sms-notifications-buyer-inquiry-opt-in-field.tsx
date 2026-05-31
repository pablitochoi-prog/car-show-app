import { SMS_NOTIFICATIONS_BUYER_INQUIRY_OPT_IN_LABEL } from "@/lib/sms-notifications-consent";
import { SmsNotificationsBuyerInquiryOptInDisclosure } from "@/components/sms/sms-notifications-buyer-inquiry-opt-in-disclosure";

type Props = {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

/** Compact SMS opt-in for the buyer-inquiry dialog during event registration. */
export function SmsNotificationsBuyerInquiryOptInField({
  id,
  checked,
  onCheckedChange,
  disabled = false,
}: Props) {
  return (
    <div className="mt-4 space-y-2 rounded-md border border-border/70 bg-muted/20 p-3">
      <label className="flex items-start gap-2 text-sm">
        <input
          id={id}
          type="checkbox"
          className="mt-1"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange(e.target.checked)}
        />
        <span>{SMS_NOTIFICATIONS_BUYER_INQUIRY_OPT_IN_LABEL}</span>
      </label>
      <SmsNotificationsBuyerInquiryOptInDisclosure />
    </div>
  );
}

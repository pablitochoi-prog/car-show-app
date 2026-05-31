import Link from "next/link";
import { SMS_NOTIFICATIONS_OPT_IN_LABEL } from "@/lib/sms-notifications-consent";
import { SmsNotificationsOptInFullDisclosure } from "@/components/sms/sms-notifications-opt-in-disclosure";

type Props = {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** When true, hide full legal text and show a compact profile hint instead. */
  alreadyOptedInAtProfile?: boolean;
};

/** Registration contact SMS opt-in — full disclosure for new consent, compact when profile already opted in. */
export function SmsNotificationsOptInField({
  id,
  checked,
  onCheckedChange,
  disabled = false,
  alreadyOptedInAtProfile = false,
}: Props) {
  return (
    <div className="space-y-2 rounded-md border border-border/70 bg-muted/20 p-3">
      <label className="flex items-start gap-2 text-sm">
        <input
          id={id}
          type="checkbox"
          className="mt-1"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange(e.target.checked)}
        />
        <span>{SMS_NOTIFICATIONS_OPT_IN_LABEL}</span>
      </label>
      {alreadyOptedInAtProfile ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          SMS notifications enabled. You can update this preference in{" "}
          <Link
            href="/dashboard/profile"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            My Profile
          </Link>
          .
        </p>
      ) : (
        <SmsNotificationsOptInFullDisclosure />
      )}
    </div>
  );
}

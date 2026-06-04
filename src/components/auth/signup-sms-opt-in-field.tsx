import Link from "next/link";
import {
  SIGNUP_SMS_OPT_IN_HEADLINE,
  SIGNUP_SMS_OPT_IN_POLICY_PATH,
} from "@/lib/sms-notifications-consent";

type Props = {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

/** Optional SMS consent on account signup — exact TCPA copy per product spec. */
export function SignupSmsOptInField({
  id,
  checked,
  onCheckedChange,
  disabled = false,
}: Props) {
  const helperId = `${id}-helper`;

  return (
    <div className="space-y-2 rounded-md border border-border/70 bg-muted/20 p-3">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          id={id}
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 rounded border"
          checked={checked}
          disabled={disabled}
          aria-describedby={helperId}
          onChange={(e) => onCheckedChange(e.target.checked)}
        />
        <span className="font-medium leading-snug text-foreground">
          {SIGNUP_SMS_OPT_IN_HEADLINE}
        </span>
      </label>
      <p id={helperId} className="text-xs leading-relaxed text-muted-foreground">
        I agree to receive SMS text messages from CarShowScout about my event
        registration, event updates, reminders, and related account activity.
        Message and data rates may apply. Message frequency varies. Reply STOP
        to opt out. View our{" "}
        <Link
          href={SIGNUP_SMS_OPT_IN_POLICY_PATH}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          SMS Text Policy
        </Link>
        .
      </p>
    </div>
  );
}

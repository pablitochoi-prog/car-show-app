"use client";

import { useState } from "react";
import { SMS_NOTIFICATIONS_OPT_IN_LABEL } from "@/lib/sms-notifications-consent";
import { SmsNotificationsOptInDetailsSheet } from "@/components/sms/sms-notifications-opt-in-details-sheet";

type Props = {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function SmsNotificationsOptInProfileField({
  id,
  checked,
  onCheckedChange,
  disabled = false,
}: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsButtonId = `${id}-details`;

  return (
    <>
      <div className="space-y-1.5">
        <label className="flex items-start gap-2 text-sm">
          <input
            id={id}
            type="checkbox"
            className="mt-0.5"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onCheckedChange(e.target.checked)}
          />
          <span>{SMS_NOTIFICATIONS_OPT_IN_LABEL}</span>
        </label>
        <p className="pl-6 text-xs leading-relaxed text-muted-foreground">
          Message frequency varies. Msg &amp; data rates may apply. Reply STOP to
          opt out.{" "}
          <button
            type="button"
            id={detailsButtonId}
            className="font-medium text-primary underline-offset-4 hover:underline"
            aria-haspopup="dialog"
            aria-expanded={detailsOpen}
            aria-controls={`${id}-disclosure-sheet`}
            onClick={() => setDetailsOpen(true)}
          >
            Details
          </button>
        </p>
      </div>

      <SmsNotificationsOptInDetailsSheet
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        contentId={`${id}-disclosure-sheet`}
      />
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  VehicleSaleListingFields,
  type VehicleSaleListingFormState,
} from "@/components/sale/vehicle-sale-listing-fields";
import { SmsNotificationsBuyerInquiryOptInField } from "@/components/sms/sms-notifications-buyer-inquiry-opt-in-field";
import {
  shouldShowBuyerInquiryDialogSmsOptIn,
  validateBuyerInquiryDialogSmsOptInRequiresPhone,
} from "@/lib/sms-notifications-consent-ui";

type Props = {
  mode?: "enable" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  vehicleLabel: string;
  value: VehicleSaleListingFormState;
  onChange: (next: VehicleSaleListingFormState) => void;
  onSave?: (saved: VehicleSaleListingFormState) => void | Promise<void>;
  /** Hide SMS section when the user's profile already has active SMS consent. */
  profileSmsOptInActive?: boolean;
  /** Show compact SMS opt-in for logged-in users without profile consent. */
  showSmsOptIn?: boolean;
  smsNotificationsOptIn?: boolean;
  onSmsNotificationsOptInChange?: (checked: boolean) => void;
  contactPhone?: string;
};

export function VehicleSaleListingDialog({
  open,
  mode = "enable",
  onOpenChange,
  eventId,
  vehicleLabel,
  value,
  onChange,
  onSave,
  profileSmsOptInActive = false,
  showSmsOptIn = false,
  smsNotificationsOptIn = false,
  onSmsNotificationsOptInChange,
  contactPhone = "",
}: Props) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setError("");
  }, [open]);

  if (!open) return null;

  const smsSectionVisible = shouldShowBuyerInquiryDialogSmsOptIn({
    showSmsOptIn,
    profileSmsOptInActive,
    hasOptInChangeHandler: Boolean(onSmsNotificationsOptInChange),
  });

  const isEditingExisting = mode === "edit";

  async function handleSave() {
    if (!value.sellerAcknowledged && !isEditingExisting) {
      setError(
        "Please acknowledge the disclaimer before accepting buyer inquiries.",
      );
      return;
    }
    const phoneError = validateBuyerInquiryDialogSmsOptInRequiresPhone({
      smsSectionVisible,
      smsNotificationsOptIn,
      contactPhone,
    });
    if (phoneError) {
      setError(phoneError);
      return;
    }

    const next: VehicleSaleListingFormState = {
      ...value,
      enabled: isEditingExisting ? value.enabled : true,
      sellerAcknowledged: value.sellerAcknowledged || isEditingExisting,
    };
    onChange(next);
    setSaving(true);
    setError("");
    try {
      await onSave?.(next);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save listing details.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close dialog"
        onClick={handleCancel}
      />
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border bg-background shadow-lg">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b px-6 py-4">
          <div className="min-w-0 pr-6">
            <h2 className="text-lg font-semibold">
              {isEditingExisting ? "Edit listing details" : "Interested in Buying?"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEditingExisting
                ? vehicleLabel
                : `${vehicleLabel} · Owner is open to inquiries`}
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
            onClick={handleCancel}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          <VehicleSaleListingFields
            eventId={eventId}
            vehicleLabel={vehicleLabel}
            value={value}
            onChange={onChange}
            showEnableCheckbox={false}
          />
          {smsSectionVisible && onSmsNotificationsOptInChange ? (
            <SmsNotificationsBuyerInquiryOptInField
              id={`buyer-inquiry-sms-${value.listingId}`}
              checked={smsNotificationsOptIn}
              onCheckedChange={onSmsNotificationsOptInChange}
            />
          ) : null}
          {error ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={
              (!value.sellerAcknowledged && !isEditingExisting) || saving
            }
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

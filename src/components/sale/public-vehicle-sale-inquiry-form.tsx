"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { SmsNotificationsOptInField } from "@/components/sms/sms-notifications-opt-in-field";
import { PublicAskingPriceDisplay } from "@/components/sale/public-asking-price-display";
import { formatWholeDollarInput } from "@/lib/money";
import { isPolicyHtmlEmpty } from "@/lib/sanitize-policy-html";
import { digitsFromPhoneInput, formatUSPhoneDigits } from "@/lib/phone-us";
import { VEHICLE_SALE_PUBLIC_DISCLAIMER } from "@/lib/vehicle-sale-disclaimer";
import type { PublicVehicleSaleListing } from "@/lib/public-vehicle-sale-listing";

type Props = {
  vehicleEntryCode: string;
  listing: PublicVehicleSaleListing;
  inquiriesOpen: boolean;
  defaultSmsNotificationsOptIn?: boolean;
};

export function PublicVehicleSaleInquiryForm({
  vehicleEntryCode,
  listing,
  inquiriesOpen,
  defaultSmsNotificationsOptIn = false,
}: Props) {
  const router = useRouter();
  const [buyerFirstName, setBuyerFirstName] = useState("");
  const [buyerLastName, setBuyerLastName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhoneDigits, setBuyerPhoneDigits] = useState("");
  const [offerAmountDollars, setOfferAmountDollars] = useState("");
  const [message, setMessage] = useState("");
  const [smsNotificationsOptIn, setSmsNotificationsOptIn] = useState(
    defaultSmsNotificationsOptIn,
  );
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const formDisabled = !inquiriesOpen;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (formDisabled) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(
        `/api/v/${encodeURIComponent(vehicleEntryCode)}/sale/inquiry`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buyerFirstName,
            buyerLastName,
            buyerEmail,
            buyerPhone: buyerPhoneDigits.trim()
              ? formatUSPhoneDigits(buyerPhoneDigits)
              : undefined,
            offerAmountDollars: listing.allowOffers
              ? offerAmountDollars.trim() || null
              : null,
            message: isPolicyHtmlEmpty(message) ? undefined : message,
            smsNotificationsOptIn,
            consent,
            website,
          }),
        },
      );

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not send inquiry. Please try again.");
        return;
      }

      router.push(
        `/v/${encodeURIComponent(vehicleEntryCode)}/sale/sent`,
      );
    } catch {
      setError("Could not send inquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-lg border bg-card p-4 shadow-sm"
      aria-disabled={formDisabled}
    >
      <div>
        <h2 className="text-lg font-semibold">Contact the owner</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {inquiriesOpen
            ? "Your message is forwarded to the vehicle owner. CarShowScout does not share your contact details publicly."
            : "Inquiries are closed for this vehicle. You can still review the listing details above."}
        </p>
      </div>

      <fieldset disabled={formDisabled} className="space-y-4 disabled:opacity-60">
        <PublicAskingPriceDisplay listing={listing} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="buyerFirstName">First Name *</Label>
            <Input
              id="buyerFirstName"
              value={buyerFirstName}
              onChange={(e) => setBuyerFirstName(e.target.value)}
              autoComplete="given-name"
              required={inquiriesOpen}
              maxLength={60}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buyerLastName">Last Name *</Label>
            <Input
              id="buyerLastName"
              value={buyerLastName}
              onChange={(e) => setBuyerLastName(e.target.value)}
              autoComplete="family-name"
              required={inquiriesOpen}
              maxLength={60}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="buyerEmail">Email *</Label>
          <Input
            id="buyerEmail"
            type="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            autoComplete="email"
            required={inquiriesOpen}
            maxLength={254}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="buyerPhone">Phone (optional)</Label>
          <Input
            id="buyerPhone"
            type="tel"
            value={formatUSPhoneDigits(buyerPhoneDigits)}
            onChange={(e) =>
              setBuyerPhoneDigits(digitsFromPhoneInput(e.target.value))
            }
            placeholder="(###) ###-####"
            autoComplete="tel"
            maxLength={14}
          />
        </div>

        <SmsNotificationsOptInField
          id="buyer-sms-notifications-opt-in"
          checked={smsNotificationsOptIn}
          onCheckedChange={setSmsNotificationsOptIn}
          alreadyOptedInAtProfile={defaultSmsNotificationsOptIn}
        />

        {listing.allowOffers ? (
          <div className="space-y-2">
            <Label htmlFor="offerAmountDollars">Your Offer (optional)</Label>
            <Input
              id="offerAmountDollars"
              inputMode="numeric"
              value={offerAmountDollars}
              onChange={(e) =>
                setOfferAmountDollars(formatWholeDollarInput(e.target.value))
              }
              placeholder="$##,####"
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="buyer-inquiry-message">Message (optional)</Label>
          <RichTextEditor
            idPrefix="buyer-inquiry-message"
            value={message}
            onChange={(html) => setMessage(isPolicyHtmlEmpty(html) ? "" : html)}
            compact
            placeholder="Tell the owner what you would like to know about this vehicle."
            aria-label="Buyer inquiry message"
          />
        </div>

        <div className="hidden" aria-hidden>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required={inquiriesOpen}
          />
          <span>{VEHICLE_SALE_PUBLIC_DISCLAIMER}</span>
        </label>
      </fieldset>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={submitting || !consent || formDisabled}
        className="w-full"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Sending…
          </>
        ) : (
          "Send inquiry"
        )}
      </Button>
    </form>
  );
}

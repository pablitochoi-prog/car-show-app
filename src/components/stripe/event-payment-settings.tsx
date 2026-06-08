"use client";

import { useEffect, useState } from "react";
import { redirectToStripeCheckout } from "@/lib/session-idle-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, DollarSign, Loader2, Lock } from "lucide-react";
import type { EventPlatformFeeMode } from "@/lib/event-platform-fee";
import {
  isPlatformFeeModeLocked,
  platformFeeModeLockReason,
} from "@/lib/event-platform-fee-mode-lock";

type Props = {
  eventId: string;
  stripeReady: boolean;
  eventStatus: string;
  platformFeeMode: EventPlatformFeeMode;
  convenienceFeeLabel: string;
  flatSetupFeeLabel: string;
  setupFeeCollected: boolean;
  platformFeePromoApplied?: boolean;
  promoCodeLast4?: string | null;
};

export function EventPaymentSettings({
  eventId,
  stripeReady,
  eventStatus,
  platformFeeMode: initialMode,
  convenienceFeeLabel,
  flatSetupFeeLabel,
  setupFeeCollected: initialSetupFeeCollected,
  platformFeePromoApplied: initialPromoApplied = false,
  promoCodeLast4: initialPromoLast4 = null,
}: Props) {
  const [platformFeeMode, setPlatformFeeMode] =
    useState<EventPlatformFeeMode>(initialMode);
  const [setupFeeCollected, setSetupFeeCollected] = useState(
    initialSetupFeeCollected,
  );
  const [promoApplied, setPromoApplied] = useState(initialPromoApplied);
  const [promoLast4, setPromoLast4] = useState(initialPromoLast4);
  const [savedMode, setSavedMode] = useState<EventPlatformFeeMode>(initialMode);
  const [saving, setSaving] = useState(false);
  const [payingSetupFee, setPayingSetupFee] = useState(false);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [payCardDismissed, setPayCardDismissed] = useState(false);
  const [promoInputOpen, setPromoInputOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const modeLocked = isPlatformFeeModeLocked({
    status: eventStatus,
    platformSetupFeeCollected: setupFeeCollected,
  });
  const lockReason = platformFeeModeLockReason({
    status: eventStatus,
    platformSetupFeeCollected: setupFeeCollected,
  });

  useEffect(() => {
    setPlatformFeeMode(initialMode);
    setSavedMode(initialMode);
    setSetupFeeCollected(initialSetupFeeCollected);
    setPromoApplied(initialPromoApplied);
    setPromoLast4(initialPromoLast4);
  }, [
    initialMode,
    initialSetupFeeCollected,
    initialPromoApplied,
    initialPromoLast4,
  ]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}/payment-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformFeeMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setSavedMode(platformFeeMode);
      setPayCardDismissed(false);
      setMessage({ type: "success", text: "Platform fee settings saved." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handlePayFlatFee() {
    setPayingSetupFee(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/events/${eventId}/platform-setup-fee/checkout`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start checkout");
      if (data.checkoutUrl) {
        await redirectToStripeCheckout(data.checkoutUrl);
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Something went wrong",
      });
      setPayingSetupFee(false);
    }
  }

  async function handleApplyPromo() {
    setApplyingPromo(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/events/${eventId}/platform-fee/promo-code/redeem`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: promoCode }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ??
            "This promo code is not valid or is no longer available.",
        );
      }
      setSetupFeeCollected(true);
      setPromoApplied(true);
      setPromoLast4(
        typeof data.codeLast4 === "string" ? data.codeLast4 : null,
      );
      setPromoInputOpen(false);
      setPromoCode("");
      setMessage({
        type: "success",
        text:
          data.message ??
          "Promo code applied. Your flat platform fee is covered for this event.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "This promo code is not valid or is no longer available.",
      });
    } finally {
      setApplyingPromo(false);
    }
  }

  if (!stripeReady) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
        Complete Stripe setup above to choose how your platform licensing fee is
        billed for this event.
      </div>
    );
  }

  const activeFeeLabel =
    platformFeeMode === "FLAT_EVENT" ? flatSetupFeeLabel : convenienceFeeLabel;

  const flatFeeCovered = setupFeeCollected;
  const showPayCard =
    platformFeeMode === "FLAT_EVENT" &&
    !flatFeeCovered &&
    !payCardDismissed;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        A platform licensing fee applies to every event. Choose how the{" "}
        <strong className="font-medium text-foreground">
          CarShowScout flat platform fee
        </strong>{" "}
        is billed before the event goes live. This does not affect registrant
        payments, your event registration fees, Stripe processing fees, or your
        organization&apos;s Stripe setup requirements.
      </p>

      {modeLocked && lockReason ? (
        <div className="flex gap-2 rounded-lg border border-muted bg-muted/30 px-4 py-3 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>{lockReason}</span>
        </div>
      ) : null}

      <fieldset className="space-y-3" disabled={modeLocked}>
        <legend className="text-sm font-medium">Platform fee</legend>
        <label
          className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${modeLocked ? "opacity-60" : "cursor-pointer"}`}
        >
          <input
            type="radio"
            name="platformFeeMode"
            value="CONVENIENCE"
            checked={platformFeeMode === "CONVENIENCE"}
            onChange={() => setPlatformFeeMode("CONVENIENCE")}
            disabled={modeLocked}
            className="mt-0.5"
          />
          <span className="text-sm">
            <span className="font-medium">Convenience fee per vehicle</span>
            <span className="mt-0.5 block text-muted-foreground">
              {convenienceFeeLabel}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Collected per vehicle when registrants pay online (via Stripe
              Connect).
            </span>
          </span>
        </label>
        <label
          className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${modeLocked ? "opacity-60" : "cursor-pointer"}`}
        >
          <input
            type="radio"
            name="platformFeeMode"
            value="FLAT_EVENT"
            checked={platformFeeMode === "FLAT_EVENT"}
            onChange={() => setPlatformFeeMode("FLAT_EVENT")}
            disabled={modeLocked}
            className="mt-0.5"
          />
          <span className="text-sm">
            <span className="font-medium">Flat platform fee</span>
            <span className="mt-0.5 block text-muted-foreground">
              {flatSetupFeeLabel}
              {flatFeeCovered ? " (covered)" : ""}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              One-time payment to CarShowScout.com for this event.
            </span>
          </span>
        </label>
      </fieldset>

      {!modeLocked ? (
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Save platform fee preference
        </Button>
      ) : null}

      {flatFeeCovered && savedMode === "FLAT_EVENT" ? (
        <div className="flex gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-950 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>
            {promoApplied
              ? `Flat platform fee covered by promo code${promoLast4 ? ` (••••${promoLast4})` : ""}.`
              : "Flat platform fee paid for this event."}
          </span>
        </div>
      ) : null}

      {showPayCard ? (
        <div className="rounded-lg border px-4 py-3 text-sm">
          <p className="font-medium">Pay flat platform fee</p>
          <p className="mt-1 text-muted-foreground">
            Pay {flatSetupFeeLabel} directly to CarShowScout.com, or apply a
            promo code if you have one. Promo codes waive only the CarShowScout
            flat platform fee for this event.
          </p>
          {savedMode !== "FLAT_EVENT" ? (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-200">
              Save your flat platform fee selection before paying or applying a
              promo code.
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={
                payingSetupFee || modeLocked || savedMode !== "FLAT_EVENT"
              }
              onClick={() => void handlePayFlatFee()}
            >
              {payingSetupFee ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Pay platform fee now
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPayCardDismissed(true)}
            >
              Pay later
            </Button>
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              onClick={() => setPromoInputOpen((open) => !open)}
            >
              Enter promo code
            </button>
          </div>
          {promoInputOpen ? (
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <Label htmlFor="platform-fee-promo-code">Promo code</Label>
              <div className="flex flex-wrap items-end gap-2">
                <Input
                  id="platform-fee-promo-code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  autoComplete="off"
                  className="max-w-xs font-mono text-sm"
                  disabled={
                    applyingPromo || modeLocked || savedMode !== "FLAT_EVENT"
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={
                    applyingPromo ||
                    !promoCode.trim() ||
                    modeLocked ||
                    savedMode !== "FLAT_EVENT"
                  }
                  onClick={() => void handleApplyPromo()}
                >
                  {applyingPromo ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Apply promo code
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
        <DollarSign className="size-4 text-muted-foreground" />
        <span>
          Selected billing:{" "}
          <span className="font-semibold">{activeFeeLabel}</span>
          {platformFeeMode === "CONVENIENCE"
            ? " — no flat event setup fee."
            : " — no per-vehicle convenience fee."}
        </span>
      </div>

      {message ? (
        <p
          className={`text-sm ${message.type === "success" ? "text-emerald-600" : "text-red-600"}`}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

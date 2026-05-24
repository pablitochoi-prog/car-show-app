"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DollarSign, Loader2, Lock } from "lucide-react";
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
};

export function EventPaymentSettings({
  eventId,
  stripeReady,
  eventStatus,
  platformFeeMode: initialMode,
  convenienceFeeLabel,
  flatSetupFeeLabel,
  setupFeeCollected,
}: Props) {
  const [platformFeeMode, setPlatformFeeMode] =
    useState<EventPlatformFeeMode>(initialMode);
  const [saving, setSaving] = useState(false);
  const [payingSetupFee, setPayingSetupFee] = useState(false);
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
  }, [initialMode]);

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
        window.location.href = data.checkoutUrl;
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

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        A platform licensing fee applies to every event. Choose how it is billed
        before the event goes live — convenience fee per vehicle or a one-time
        flat fee paid to CarShowScout.com. This choice locks when the event is
        published for registration.
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
            <span className="font-medium">Convenience fee</span>
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
              {setupFeeCollected ? " (paid)" : ""}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              One-time payment to CarShowScout.com for this event.
            </span>
          </span>
        </label>
      </fieldset>

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

      {platformFeeMode === "FLAT_EVENT" && !setupFeeCollected ? (
        <div className="rounded-lg border px-4 py-3 text-sm">
          <p className="font-medium">Pay flat platform fee</p>
          <p className="mt-1 text-muted-foreground">
            Pay {flatSetupFeeLabel} directly to CarShowScout.com. After payment, the
            billing option is locked for this event.
          </p>
          {initialMode !== "FLAT_EVENT" ? (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-200">
              Save your flat platform fee selection before paying.
            </p>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="mt-3"
            disabled={
              payingSetupFee ||
              modeLocked ||
              initialMode !== "FLAT_EVENT"
            }
            onClick={() => void handlePayFlatFee()}
          >
            {payingSetupFee ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Pay {flatSetupFeeLabel}
          </Button>
        </div>
      ) : null}

      {message ? (
        <p
          className={`text-sm ${message.type === "success" ? "text-emerald-600" : "text-red-600"}`}
        >
          {message.text}
        </p>
      ) : null}

      {!modeLocked ? (
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Save platform fee
        </Button>
      ) : null}
    </div>
  );
}

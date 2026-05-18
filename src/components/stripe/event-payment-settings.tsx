"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DollarSign, Loader2 } from "lucide-react";

type Props = {
  eventId: string;
  stripeReady: boolean;
  paymentEnabled: boolean;
  convenienceFeeLabel: string;
};

export function EventPaymentSettings({
  eventId,
  stripeReady,
  paymentEnabled: initialEnabled,
  convenienceFeeLabel,
}: Props) {
  const [paymentEnabled, setPaymentEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}/payment-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentEnabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setMessage({ type: "success", text: "Payment settings saved." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!stripeReady) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
        Complete Stripe setup above before enabling payments for this event.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          id="paymentEnabled"
          type="checkbox"
          checked={paymentEnabled}
          onChange={(e) => setPaymentEnabled(e.target.checked)}
          className="size-4 rounded border-gray-300"
        />
        <Label htmlFor="paymentEnabled" className="cursor-pointer font-medium">
          Enable paid registration for this event
        </Label>
      </div>

      {paymentEnabled && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <DollarSign className="size-4 text-muted-foreground" />
          <span>
            A <span className="font-semibold">{convenienceFeeLabel}</span>{" "}
            convenience fee is applied by CarShowScout.
          </span>
        </div>
      )}

      {message && (
        <p
          className={`text-sm ${message.type === "success" ? "text-emerald-600" : "text-red-600"}`}
        >
          {message.text}
        </p>
      )}

      <Button onClick={handleSave} disabled={saving} size="sm">
        {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
        Save Payment Settings
      </Button>
    </div>
  );
}

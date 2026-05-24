"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign } from "lucide-react";

type SetupFeeConfig = {
  amountCents: number;
};

export function AdminEventSetupFee() {
  const [amountDollars, setAmountDollars] = useState(75);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/event-setup-fee", {
        credentials: "same-origin",
      });
      if (res.ok) {
        const data = (await res.json()) as { fee: SetupFeeConfig };
        setAmountDollars((data.fee.amountCents ?? 7500) / 100);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/event-setup-fee", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ amountCents: Math.round(amountDollars * 100) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setMessage({ type: "success", text: "Event setup fee updated." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading event setup fee...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
        <DollarSign className="size-4 text-muted-foreground" />
        <span>
          Current fee:{" "}
          <span className="font-semibold">
            ${amountDollars.toFixed(2)} per event
          </span>
        </span>
      </div>

      <div>
        <Label htmlFor="admin-setup-fee-amount">Amount (in dollars)</Label>
        <Input
          id="admin-setup-fee-amount"
          type="number"
          min={0}
          step={0.01}
          value={amountDollars}
          onChange={(e) => setAmountDollars(Number(e.target.value))}
          placeholder="e.g. 75.00"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Flat platform fee when an organizer chooses event setup fee instead of
          per-vehicle convenience fee.
        </p>
      </div>

      {message ? (
        <p
          className={`text-sm ${message.type === "success" ? "text-emerald-600" : "text-red-600"}`}
        >
          {message.text}
        </p>
      ) : null}

      <Button onClick={handleSave} disabled={saving} size="sm">
        {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Save Event Setup Fee
      </Button>
    </div>
  );
}

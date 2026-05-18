"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";

export function CustomRefundDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (amountCents: number) => Promise<void>;
}) {
  const [dollars, setDollars] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDollars("");
    setError("");
    setBusy(false);
  }, [open]);

  async function handleSubmit() {
    const parsed = Number.parseFloat(dollars.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a valid refund amount.");
      return;
    }
    const cents = Math.round(parsed * 100);
    setBusy(true);
    setError("");
    try {
      await onConfirm(cents);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refund failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative mx-4 w-full max-w-md rounded-xl border bg-background p-6 shadow-lg">
        <button
          type="button"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:text-foreground"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-4" />
        </button>
        <h2 className="text-lg font-semibold">Custom refund</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Refund a custom amount for {selectedCount} selected registration
          {selectedCount === 1 ? "" : "s"} (per registration).
        </p>
        <div className="mt-4 space-y-2">
          <Label htmlFor="refund-amount">Amount (USD)</Label>
          <Input
            id="refund-amount"
            inputMode="decimal"
            placeholder="0.00"
            value={dollars}
            onChange={(e) => setDollars(e.target.value)}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button size="sm" disabled={busy} onClick={() => void handleSubmit()}>
            {busy ? <Loader2 className="size-3 animate-spin" /> : null}
            Apply refund
          </Button>
        </div>
      </div>
    </div>
  );
}

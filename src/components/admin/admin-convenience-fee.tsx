"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign } from "lucide-react";

type FeeType = "NONE" | "FIXED" | "PERCENT";

type FeeConfig = {
  type: FeeType;
  amountCents: number | null;
  percent: number | null;
};

export function AdminConvenienceFee() {
  const [feeType, setFeeType] = useState<FeeType>("FIXED");
  const [amountCents, setAmountCents] = useState(50);
  const [percent, setPercent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/convenience-fee", {
        credentials: "same-origin",
      });
      if (res.ok) {
        const data = (await res.json()) as { fee: FeeConfig };
        setFeeType(data.fee.type);
        setAmountCents(data.fee.amountCents ?? 0);
        setPercent(data.fee.percent ?? 0);
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
      const res = await fetch("/api/admin/convenience-fee", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          type: feeType,
          amountCents: feeType === "FIXED" ? amountCents : null,
          percent: feeType === "PERCENT" ? percent : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setMessage({ type: "success", text: "Convenience fee updated." });
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
        Loading fee settings...
      </div>
    );
  }

  const previewLabel =
    feeType === "FIXED" && amountCents > 0
      ? `$${(amountCents / 100).toFixed(2)} per registration`
      : feeType === "PERCENT" && percent > 0
        ? `${percent}% of registration price`
        : "No fee";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
        <DollarSign className="size-4 text-muted-foreground" />
        <span>
          Current fee: <span className="font-semibold">{previewLabel}</span>
        </span>
      </div>

      <div>
        <Label className="text-sm font-medium">Fee Type</Label>
        <select
          value={feeType}
          onChange={(e) => setFeeType(e.target.value as FeeType)}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="NONE">No convenience fee</option>
          <option value="FIXED">Fixed amount per registration</option>
          <option value="PERCENT">Percentage of registration price</option>
        </select>
      </div>

      {feeType === "FIXED" && (
        <div>
          <Label htmlFor="admin-fee-amount">Amount (cents)</Label>
          <Input
            id="admin-fee-amount"
            type="number"
            min={0}
            value={amountCents}
            onChange={(e) => setAmountCents(Number(e.target.value))}
            placeholder="e.g. 50 = $0.50"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {amountCents > 0
              ? `$${(amountCents / 100).toFixed(2)} charged to registrant on each paid registration`
              : "Enter amount in cents"}
          </p>
        </div>
      )}

      {feeType === "PERCENT" && (
        <div>
          <Label htmlFor="admin-fee-percent">Percentage</Label>
          <Input
            id="admin-fee-percent"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value))}
            placeholder="e.g. 5"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {percent > 0
              ? `${percent}% of each registration price`
              : "Enter percentage (0\u2013100)"}
          </p>
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
        Save Fee
      </Button>
    </div>
  );
}

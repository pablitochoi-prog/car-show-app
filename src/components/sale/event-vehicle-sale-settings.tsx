"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const SELLER_DISCLAIMER =
  "CarShowScout forwards buyer inquiries only. We are not a broker, dealer, inspector, appraiser, escrow provider, or party to any sale.";

type Props = {
  eventId: string;
  onStatusChange?: (enabled: boolean) => void;
};

export function EventVehicleSaleSettings({ eventId, onStatusChange }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/vehicle-sale-settings`, {
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        vehicleSaleInquiriesEnabled?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error ?? "Could not load vehicle sale settings.",
        });
        return;
      }
      const next = Boolean(data.vehicleSaleInquiriesEnabled);
      setEnabled(next);
      onStatusChange?.(next);
    } catch {
      setMessage({ type: "error", text: "Network error loading settings." });
    } finally {
      setLoading(false);
    }
  }, [eventId, onStatusChange]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}/vehicle-sale-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ vehicleSaleInquiriesEnabled: enabled }),
      });
      const data = (await res.json()) as {
        vehicleSaleInquiriesEnabled?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error ?? "Could not save settings.",
        });
        return;
      }
      const next = Boolean(data.vehicleSaleInquiriesEnabled);
      setEnabled(next);
      onStatusChange?.(next);
      setMessage({ type: "success", text: "Settings saved." });
    } catch {
      setMessage({ type: "error", text: "Network error saving settings." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        When enabled, registrants may mark vehicles as accepting purchase
        inquiries. Buyers submit contact details through CarShowScout — owner
        email and phone are never shown publicly.
      </p>

      <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
        <input
          id="vehicleSaleInquiriesEnabled"
          type="checkbox"
          className="mt-1 size-4 rounded border-input"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        <div className="space-y-1">
          <Label
            htmlFor="vehicleSaleInquiriesEnabled"
            className="cursor-pointer font-medium"
          >
            Allow vehicle owners to mark vehicles as available for sale
          </Label>
          <p className="text-xs text-muted-foreground">{SELLER_DISCLAIMER}</p>
        </div>
      </div>

      {message ? (
        <p
          className={
            message.type === "error"
              ? "text-sm text-destructive"
              : "text-sm text-green-700 dark:text-green-400"
          }
        >
          {message.text}
        </p>
      ) : null}

      <Button type="button" onClick={() => void handleSave()} disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save"
        )}
      </Button>
    </div>
  );
}

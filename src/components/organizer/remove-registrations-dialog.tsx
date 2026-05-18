"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";

export function RemoveRegistrationsDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: () => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setBusy(false);
  }, [open]);

  async function handleConfirm() {
    setBusy(true);
    setError("");
    try {
      const ok = await onConfirm();
      if (ok) {
        onOpenChange(false);
        return;
      }
      setError(
        "Could not remove the selected registration(s). See the message above the table.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed.");
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
        <h2 className="text-lg font-semibold">Remove from event</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently remove {selectedCount} registration
          {selectedCount === 1 ? "" : "s"} from this event? This cannot be undone.
          Only cancelled or unpaid pending registrations can be removed.
        </p>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Keep
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={() => void handleConfirm()}
          >
            {busy ? <Loader2 className="size-3 animate-spin" /> : null}
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}

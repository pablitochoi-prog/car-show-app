"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";

export function AdminDeleteSaleInquiriesDialog({
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
      setError("Could not delete the selected inquiries. Please try again.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
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
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
        <h2 className="text-lg font-semibold">Delete sale inquiries</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently delete {selectedCount} sale inquir
          {selectedCount === 1 ? "y" : "ies"}? This cannot be undone.
        </p>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={() => void handleConfirm()}
          >
            {busy ? <Loader2 className="size-3 animate-spin" /> : null}
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

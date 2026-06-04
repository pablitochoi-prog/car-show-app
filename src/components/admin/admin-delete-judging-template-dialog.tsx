"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminDeleteJudgingTemplateDialog({
  open,
  templateId,
  templateName,
  eventCopyCount,
  onClose,
  onDeleted,
}: {
  open: boolean;
  templateId: string;
  templateName: string;
  eventCopyCount: number;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setError("");
    }
  }, [open]);

  async function handleDelete() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/judging-templates/${templateId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Delete failed.");
      onDeleted();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => !submitting && onClose()}
        aria-hidden
      />
      <div
        className="relative mx-4 w-full max-w-md rounded-xl border bg-background p-6 shadow-lg"
        role="alertdialog"
        aria-labelledby="delete-template-title"
        aria-describedby="delete-template-desc"
      >
        <button
          type="button"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:text-foreground"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
        <h2 id="delete-template-title" className="text-lg font-semibold">
          Permanently delete scoring template?
        </h2>
        <p id="delete-template-desc" className="mt-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{templateName}</span> will be
          removed from the platform library. This cannot be undone.
        </p>
        {eventCopyCount > 0 ? (
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
            {eventCopyCount} event{eventCopyCount === 1 ? "" : "s"} previously cloned
            this template. Those event score sheets are kept; only the master library
            entry is deleted.
          </p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={submitting}
            onClick={() => void handleDelete()}
          >
            {submitting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Delete permanently
          </Button>
        </div>
      </div>
    </div>
  );
}

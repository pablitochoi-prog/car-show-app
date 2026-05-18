"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function CancelRegistrationButton({
  registrationId,
}: {
  registrationId: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");

  async function handleCancel() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/registrations/${registrationId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setSubmitting(false);
      setConfirming(false);
      setNote("");
    }
  }

  if (confirming) {
    return (
      <div className="w-full space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
        <p className="text-sm font-medium text-destructive">
          Cancel this registration?
        </p>
        <textarea
          placeholder="Reason or notes (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="destructive"
            disabled={submitting}
            onClick={() => void handleCancel()}
            className="gap-1"
          >
            {submitting && <Loader2 className="size-3 animate-spin" />}
            Yes, cancel
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={submitting}
            onClick={() => { setConfirming(false); setNote(""); }}
          >
            Keep registration
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={() => setConfirming(true)}
    >
      Cancel Registration
    </Button>
  );
}

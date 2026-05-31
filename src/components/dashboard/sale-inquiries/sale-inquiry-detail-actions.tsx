"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  inquiryId: string;
  status: string;
};

export function SaleInquiryDetailActions({ inquiryId, status }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"contacted" | "archive" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: "mark_contacted" | "archive") {
    setSubmitting(action === "mark_contacted" ? "contacted" : "archive");
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/sale-inquiries/${inquiryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not update inquiry.");
        return;
      }
      if (action === "archive") {
        router.push("/dashboard/sale-inquiries");
        router.refresh();
        return;
      }
      router.refresh();
    } catch {
      setError("Could not update inquiry.");
    } finally {
      setSubmitting(null);
    }
  }

  const isArchived = status === "ARCHIVED";
  const isContacted = status === "CONTACTED";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={isArchived || isContacted || submitting != null}
          onClick={() => runAction("mark_contacted")}
        >
          {submitting === "contacted" ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Mark contacted"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isArchived || submitting != null}
          onClick={() => runAction("archive")}
        >
          {submitting === "archive" ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Archiving…
            </>
          ) : (
            "Archive"
          )}
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

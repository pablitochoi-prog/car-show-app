"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DeletePreview = {
  user: { id: string; name: string; email: string; platformRole: string };
  eventStaff: {
    id: string;
    eventId: string;
    eventName: string;
    showNumber: number;
    roles: string[];
  }[];
  registrations: {
    id: string;
    event: { id: string; name: string; showNumber: number };
  }[];
  vehicles: { id: string; year: number; make: string; model: string }[];
  orgMemberships: { id: string; name: string }[];
};

type Props = {
  userId: string;
  userLabel: string;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
};

export function AdminDeleteUserDialog({
  userId,
  userLabel,
  open,
  onClose,
  onDeleted,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [preview, setPreview] = useState<DeletePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reassignQuery, setReassignQuery] = useState("");
  const [reassignResults, setReassignResults] = useState<
    { id: string; firstName: string; lastName: string; email: string }[]
  >([]);
  const [reassignToUserId, setReassignToUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setPreview(null);
      setError("");
      setReassignQuery("");
      setReassignResults([]);
      setReassignToUserId("");
      return;
    }

    setLoading(true);
    setError("");
    void fetch(`/api/admin/accounts/${userId}/delete`, { credentials: "same-origin" })
      .then(async (res) => {
        const data = (await res.json()) as DeletePreview & { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to load");
        setPreview(data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [open, userId]);

  async function searchReassignTarget() {
    if (!reassignQuery.trim()) return;
    const res = await fetch(
      `/api/admin/accounts?q=${encodeURIComponent(reassignQuery.trim())}`,
      { credentials: "same-origin" },
    );
    const data = (await res.json()) as {
      accounts?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      }[];
    };
    setReassignResults(
      (data.accounts ?? []).filter((a) => a.id !== userId).slice(0, 8),
    );
  }

  async function handleDelete() {
    if (!reassignToUserId) {
      setError("Select a user to receive reassigned records.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/accounts/${userId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ reassignToUserId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      onDeleted();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const assignee = reassignResults.find((a) => a.id === reassignToUserId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-background p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Permanently delete user</h2>
        <p className="mt-1 text-sm text-muted-foreground">{userLabel}</p>

        {loading && (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {preview && !loading && step === 1 && (
          <div className="mt-4 space-y-3 text-sm">
            <p className="font-medium">Records to reassign before delete:</p>
            <ul className="list-inside list-disc text-muted-foreground">
              <li>{preview.eventStaff.length} event staff role(s)</li>
              <li>{preview.registrations.length} registration(s)</li>
              <li>{preview.vehicles.length} vehicle(s)</li>
              <li>{preview.orgMemberships.length} club membership(s) (removed)</li>
            </ul>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" onClick={() => setStep(2)}>
                Next: Choose assignee
              </Button>
            </div>
          </div>
        )}

        {preview && step === 2 && (
          <div className="mt-4 space-y-3">
            <Label htmlFor="reassign-search">Reassign all records to</Label>
            <div className="flex gap-2">
              <Input
                id="reassign-search"
                value={reassignQuery}
                onChange={(e) => setReassignQuery(e.target.value)}
                placeholder="Search by name or email…"
              />
              <Button type="button" variant="secondary" onClick={() => void searchReassignTarget()}>
                Search
              </Button>
            </div>
            {reassignResults.length > 0 && (
              <ul className="max-h-40 overflow-y-auto rounded-md border">
                {reassignResults.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 ${
                        reassignToUserId === a.id ? "bg-primary/10" : ""
                      }`}
                      onClick={() => setReassignToUserId(a.id)}
                    >
                      {a.firstName} {a.lastName} — {a.email}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-between gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                type="button"
                disabled={!reassignToUserId}
                onClick={() => setStep(3)}
              >
                Review
              </Button>
            </div>
          </div>
        )}

        {preview && step === 3 && (
          <div className="mt-4 space-y-3 text-sm">
            <p>
              All event staff, registrations, and vehicles will move to{" "}
              <span className="font-medium">
                {assignee
                  ? `${assignee.firstName} ${assignee.lastName}`
                  : "selected user"}
              </span>
              . Club memberships will be removed. This cannot be undone.
            </p>
            <div className="flex justify-between gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={submitting}
                onClick={() => void handleDelete()}
              >
                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Delete permanently
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

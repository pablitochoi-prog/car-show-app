"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { VehicleEntryHeader } from "@/components/vehicle-entry/vehicle-entry-header";
import type { VehicleEntryRecord } from "@/lib/vehicle-entry-types";

type Props = {
  entry: VehicleEntryRecord;
  judgingOpen: boolean;
  initialScore: number | null;
  initialNotes: string | null;
};

export function JudgeScorePanel({
  entry,
  judgingOpen,
  initialScore,
  initialNotes,
}: Props) {
  const [score, setScore] = useState(
    initialScore != null ? String(initialScore) : "",
  );
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitScore(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(
        `/api/v/${encodeURIComponent(entry.vehicleEntryCode)}/judge-score`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score: Number.parseInt(score, 10),
            notes: notes.trim() || null,
          }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save score.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Could not save score. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const photoSrc = entry.photoUrl;

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <VehicleEntryHeader
        entry={entry}
        subtitle={
          judgingOpen
            ? "Enter your score for this vehicle."
            : "Judging is not open for this show right now."
        }
      />

      {photoSrc ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-muted">
          {photoSrc.startsWith("/api/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoSrc}
              alt={`${entry.make} ${entry.model}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <Image
              src={photoSrc}
              alt={`${entry.make} ${entry.model}`}
              fill
              className="object-cover"
              unoptimized
            />
          )}
        </div>
      ) : null}

      <form
        onSubmit={(e) => void submitScore(e)}
        className="space-y-4 rounded-lg border bg-card p-4 shadow-sm"
      >
        {!judgingOpen ? (
          <p className="text-sm text-muted-foreground">
            Scoring is closed for this event.
          </p>
        ) : (
          <>
            <div>
              <label
                htmlFor="judge-score"
                className="mb-1 block text-sm font-medium"
              >
                Score (1–100)
              </label>
              <input
                id="judge-score"
                type="number"
                min={1}
                max={100}
                required
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="judge-notes"
                className="mb-1 block text-sm font-medium"
              >
                Notes (optional)
              </label>
              <textarea
                id="judge-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Saving…" : "Save score"}
            </Button>
          </>
        )}
        {saved ? (
          <p className="text-sm font-medium text-green-700">Score saved.</p>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { VehicleEntryHeader } from "@/components/vehicle-entry/vehicle-entry-header";
import type { VehicleEntryRecord } from "@/lib/vehicle-entry-types";

type Props = {
  entry: VehicleEntryRecord;
  votingOpen: boolean;
  alreadyVoted: boolean;
};

export function PublicVotePanel({ entry, votingOpen, alreadyVoted }: Props) {
  const [voted, setVoted] = useState(alreadyVoted);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitVote() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v/${encodeURIComponent(entry.vehicleEntryCode)}/vote`,
        { method: "POST" },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not submit vote.");
        return;
      }
      setVoted(true);
    } catch {
      setError("Could not submit vote. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const photoSrc = entry.photoUrl?.startsWith("/api/")
    ? entry.photoUrl
    : entry.photoUrl;

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <VehicleEntryHeader
        entry={entry}
        subtitle={
          votingOpen
            ? "Cast your vote for this vehicle."
            : "Voting is not open for this show right now."
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

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        {!votingOpen ? (
          <p className="text-sm text-muted-foreground">
            This event is not accepting public votes at the moment.
          </p>
        ) : voted ? (
          <p className="font-medium text-green-700">
            Thank you — your vote has been recorded.
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              One vote per visitor for this vehicle. Duplicate votes are not
              allowed.
            </p>
            <Button
              type="button"
              className="w-full"
              disabled={pending}
              onClick={() => void submitVote()}
            >
              {pending ? "Submitting…" : "Vote for this vehicle"}
            </Button>
          </>
        )}
        {error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { VehiclePhotoDisplay } from "@/components/vehicle/vehicle-photo-display";
import { PublicVotingPeriodStatusTag } from "@/components/vehicle-entry/public-voting-period-status-tag";
import { cn } from "@/lib/utils";
import type { PublicVotingPeriodStatus } from "@/lib/vehicle-voting-types";
import type {
  PublicVoteCategoryUiState,
  VisitorPublicVoteContext,
} from "@/lib/vehicle-voting";
import type { VehicleEntryRecord } from "@/lib/vehicle-entry-types";

type Props = {
  entry: VehicleEntryRecord;
  votingOpen: boolean;
  votingPeriodStatus: PublicVotingPeriodStatus;
  voteContext: VisitorPublicVoteContext;
  buyerInquiryNotice?: string | null;
};

function vehicleTitle(entry: VehicleEntryRecord): string {
  const parts = [
    entry.year > 0 ? entry.year : null,
    entry.make,
    entry.model,
    entry.trim?.trim() || null,
  ].filter(Boolean);
  return parts.join(" ");
}

function categoryButtonTitle(
  state: PublicVoteCategoryUiState,
  name: string,
): string | undefined {
  switch (state) {
    case "voted_here":
      return `Your ${name} vote for this vehicle is recorded.`;
    case "used_elsewhere":
      return `You already used your ${name} vote on another vehicle at this show.`;
    case "closed":
      return `${name} voting is not open right now.`;
    default:
      return undefined;
  }
}

function categoryGridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  if (count === 3) return "grid-cols-3";
  if (count === 4) return "grid-cols-4";
  return "grid-cols-2 sm:grid-cols-3";
}

export function PublicVotePanel({
  entry,
  votingOpen,
  votingPeriodStatus,
  voteContext,
  buyerInquiryNotice,
}: Props) {
  const [categoryStates, setCategoryStates] = useState(
    voteContext.categoryStates,
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { categories } = voteContext;
  const availableCategories = categories.filter(
    (c) => categoryStates[c.id] === "available",
  );
  const votedHereCategories = categories.filter(
    (c) => categoryStates[c.id] === "voted_here",
  );
  const allUnavailable =
    categories.length > 0 && availableCategories.length === 0;

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
    setError(null);
  }

  async function submitVote() {
    if (selectedCategoryIds.size === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v/${encodeURIComponent(entry.vehicleEntryCode)}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            votingCategoryIds: [...selectedCategoryIds],
          }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not submit vote.");
        return;
      }
      setCategoryStates((prev) => {
        const next = { ...prev };
        for (const id of selectedCategoryIds) {
          next[id] = "voted_here";
        }
        return next;
      });
      setSelectedCategoryIds(new Set());
    } catch {
      setError("Could not submit vote. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const photoSrc = entry.photoUrl;
  const showVotingForm = votingOpen && categories.length > 0 && !allUnavailable;

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4">
      {buyerInquiryNotice ? (
        <p
          className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-center text-sm font-medium text-foreground"
          role="status"
        >
          {buyerInquiryNotice}
        </p>
      ) : null}

      <header className="space-y-2 border-b border-border pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="shrink-0 font-mono text-2xl font-bold tracking-wide text-red-700">
              {entry.vehicleEntryCode}
            </p>
            <PublicVotingPeriodStatusTag status={votingPeriodStatus} />
          </div>
          <p className="max-w-[48%] shrink-0 text-right text-xs font-medium leading-snug text-muted-foreground sm:text-sm">
            {entry.event.name}
          </p>
        </div>
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
          {vehicleTitle(entry)}
        </h1>
        {entry.nickname ? (
          <p className="text-base italic text-red-700">
            &ldquo;{entry.nickname}&rdquo;
          </p>
        ) : null}
      </header>

      <section className="rounded-lg border bg-card p-3 shadow-sm sm:p-4">
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Public voting categories are not configured for this event yet.
          </p>
        ) : allUnavailable ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            {votedHereCategories.length > 0 ? (
              <p>
                Your vote{votedHereCategories.length === 1 ? "" : "s"} for this
                vehicle:{" "}
                <span className="font-medium text-foreground">
                  {votedHereCategories.map((c) => c.name).join(", ")}
                </span>
                .
              </p>
            ) : (
              <p>
                You cannot cast another vote for this vehicle with your remaining
                category votes.
              </p>
            )}
          </div>
        ) : showVotingForm ? (
          <>
            {votedHereCategories.length > 0 ? (
              <p className="mb-2 text-sm text-muted-foreground">
                Recorded:{" "}
                <span className="font-medium text-foreground">
                  {votedHereCategories.map((c) => c.name).join(", ")}
                </span>
              </p>
            ) : null}
            <p className="mb-3 text-sm text-muted-foreground">
              Select one or more categories, then tap Submit vote. One vote per
              category per car show.
            </p>

            <div className={cn("grid gap-2", categoryGridClass(categories.length))}>
              {categories.map((cat) => {
                const state = categoryStates[cat.id] ?? "closed";
                const isAvailable = state === "available";
                const isSelected = selectedCategoryIds.has(cat.id);
                const voteUsed =
                  state === "voted_here" || state === "used_elsewhere";

                return (
                  <Button
                    key={cat.id}
                    type="button"
                    size="lg"
                    variant={isSelected ? "default" : "outline"}
                    title={categoryButtonTitle(state, cat.name)}
                    className={cn(
                      "h-auto min-h-[5.5rem] w-full whitespace-normal px-2 py-2 text-center text-xs leading-snug sm:min-h-[6rem] sm:text-sm",
                      isSelected && "bg-primary text-primary-foreground",
                      isAvailable &&
                        !isSelected &&
                        "border-border bg-background text-foreground hover:bg-muted",
                      voteUsed &&
                        "cursor-not-allowed border-muted bg-muted text-muted-foreground hover:bg-muted disabled:opacity-100",
                      state === "closed" &&
                        "cursor-not-allowed border-muted/60 bg-muted/50 text-muted-foreground hover:bg-muted/50 disabled:opacity-80",
                    )}
                    disabled={!isAvailable || submitting}
                    aria-pressed={isSelected}
                    aria-disabled={voteUsed || state === "closed"}
                    onClick={() => {
                      if (!isAvailable || submitting) return;
                      toggleCategory(cat.id);
                    }}
                  >
                    {cat.name}
                  </Button>
                );
              })}
            </div>

            <Button
              type="button"
              size="lg"
              className="mt-3 h-11 w-full sm:h-12"
              disabled={selectedCategoryIds.size === 0 || submitting}
              onClick={() => void submitVote()}
            >
              {submitting
                ? "Submitting…"
                : selectedCategoryIds.size > 1
                  ? `Submit ${selectedCategoryIds.size} votes`
                  : "Submit vote"}
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Voting is not open for this show right now.
          </p>
        )}
        {error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <VehiclePhotoDisplay
        src={photoSrc}
        alt={`${entry.make} ${entry.model}`}
        size="full"
      />
    </div>
  );
}

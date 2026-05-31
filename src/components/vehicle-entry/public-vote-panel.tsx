"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { VehicleEntryHeader } from "@/components/vehicle-entry/vehicle-entry-header";
import { VehiclePhotoDisplay } from "@/components/vehicle/vehicle-photo-display";
import { cn } from "@/lib/utils";
import type {
  PublicVoteCategoryUiState,
  VisitorPublicVoteContext,
} from "@/lib/vehicle-voting";
import type { VehicleEntryRecord } from "@/lib/vehicle-entry-types";

type Props = {
  entry: VehicleEntryRecord;
  votingOpen: boolean;
  voteContext: VisitorPublicVoteContext;
  buyerInquiryNotice?: string | null;
};

function categoryHelperText(
  state: PublicVoteCategoryUiState,
  name: string,
): string | null {
  switch (state) {
    case "voted_here":
      return `Your ${name} vote for this vehicle is recorded.`;
    case "used_elsewhere":
      return `You already used your ${name} vote on another vehicle at this show.`;
    case "other_category_on_vehicle":
      return `You already voted for this vehicle in another category.`;
    case "closed":
      return `${name} voting is not open right now.`;
    default:
      return null;
  }
}

export function PublicVotePanel({
  entry,
  votingOpen,
  voteContext,
  buyerInquiryNotice,
}: Props) {
  const [categoryStates, setCategoryStates] = useState(
    voteContext.categoryStates,
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { categories } = voteContext;
  const votedCategory = categories.find(
    (c) => categoryStates[c.id] === "voted_here",
  );
  const allUnavailable =
    categories.length > 0 &&
    categories.every(
      (c) =>
        categoryStates[c.id] === "used_elsewhere" ||
        categoryStates[c.id] === "other_category_on_vehicle" ||
        categoryStates[c.id] === "closed",
    );

  const selectedCategory =
    categories.find((c) => c.id === selectedCategoryId) ?? null;

  async function submitVote() {
    if (!selectedCategory) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v/${encodeURIComponent(entry.vehicleEntryCode)}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ votingCategoryId: selectedCategory.id }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not submit vote.");
        return;
      }
      setCategoryStates((prev) => {
        const next = {
          ...prev,
          [selectedCategory.id]: "voted_here" as const,
        };
        for (const cat of categories) {
          if (cat.id !== selectedCategory.id && next[cat.id] === "available") {
            next[cat.id] = "other_category_on_vehicle";
          }
        }
        return next;
      });
      setSelectedCategoryId(null);
    } catch {
      setError("Could not submit vote. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const photoSrc = entry.photoUrl;

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      {buyerInquiryNotice ? (
        <p
          className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-center text-sm font-medium text-foreground"
          role="status"
        >
          {buyerInquiryNotice}
        </p>
      ) : null}
      <VehicleEntryHeader
        entry={entry}
        subtitle={
          votingOpen
            ? "Cast your vote for this vehicle."
            : "Voting is not open for this show right now."
        }
      />

      <VehiclePhotoDisplay
        src={photoSrc}
        alt={`${entry.make} ${entry.model}`}
        size="full"
      />

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        {!votingOpen ? (
          <p className="text-sm text-muted-foreground">
            This event is not accepting public votes at the moment.
          </p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Public voting categories are not configured for this event yet.
          </p>
        ) : votedCategory ? (
          <p className="text-sm text-muted-foreground">
            {categoryHelperText("voted_here", votedCategory.name)}
          </p>
        ) : allUnavailable ? (
          <p className="text-sm text-muted-foreground">
            You cannot cast another vote for this vehicle with your remaining
            category votes.
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Select a category, then tap Submit vote. You get one vote per
              category for the whole show — e.g. People&apos;s Choice for one car
              and Kid&apos;s Choice for another.
            </p>

            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const state = categoryStates[cat.id] ?? "closed";
                const isAvailable = state === "available";
                const isSelected = selectedCategoryId === cat.id;
                const helper = categoryHelperText(state, cat.name);

                return (
                  <div
                    key={cat.id}
                    className={cn(
                      "min-w-[calc(50%-0.25rem)] flex-1 space-y-1",
                      categories.length === 1 && "min-w-full",
                    )}
                  >
                    <Button
                      type="button"
                      size="lg"
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "h-11 w-full text-sm sm:h-12",
                        isSelected && "bg-primary text-primary-foreground",
                        !isSelected &&
                          isAvailable &&
                          "border-border bg-background text-foreground hover:bg-muted",
                      )}
                      disabled={!isAvailable || submitting}
                      aria-pressed={isSelected}
                      onClick={() => {
                        if (!isAvailable || submitting) return;
                        setSelectedCategoryId(cat.id);
                        setError(null);
                      }}
                    >
                      {cat.name}
                    </Button>
                    {helper && !isAvailable ? (
                      <p className="text-xs text-muted-foreground">{helper}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              size="lg"
              className="mt-4 h-11 w-full sm:h-12"
              disabled={!selectedCategory || submitting}
              onClick={() => void submitVote()}
            >
              {submitting ? "Submitting…" : "Submit vote"}
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

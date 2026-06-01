"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { JudgeBallotStatusBadge } from "@/components/judge/judge-ballot-status-badge";
import type { JudgeBallotCategoryStatus } from "@prisma/client";

type CategoryRow = {
  id: string;
  name: string;
  status: JudgeBallotCategoryStatus;
  votesPerJudge: number;
  maxVotesPerJudgePerVehicle: number;
  votesUsed: number;
  votesRemaining: number;
  eligibleClassesSummary: string;
  canEdit: boolean;
};

export function JudgeBallotCategoryList({ eventId }: { eventId: string }) {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [eventName, setEventName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/judge/events/${eventId}/ballot`, {
          credentials: "same-origin",
        });
        const data = (await res.json()) as {
          categories?: CategoryRow[];
          event?: { name: string };
          error?: string;
          code?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load award categories.");
        }
        setCategories(data.categories ?? []);
        setEventName(data.event?.name ?? "");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load.");
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        Loading award categories…
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    );
  }

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No award categories are available for you on this event yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {eventName ? (
        <p className="text-sm text-muted-foreground">{eventName}</p>
      ) : null}
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/judge/events/${eventId}/ballot/${cat.id}`}
          className="block"
        >
          <Card className="transition-colors active:bg-muted/50">
            <CardContent className="flex items-center gap-3 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{cat.name}</span>
                  <JudgeBallotStatusBadge status={cat.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {cat.votesRemaining} of {cat.votesPerJudge} vote
                  {cat.votesPerJudge === 1 ? "" : "s"} remaining · max{" "}
                  {cat.maxVotesPerJudgePerVehicle}/vehicle
                </p>
                <p className="text-xs text-muted-foreground">
                  Eligible: {cat.eligibleClassesSummary}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-xs font-medium text-primary">
                  {cat.canEdit ? "Start voting" : "View ballot"}
                </span>
                <ChevronRight className="ml-auto size-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

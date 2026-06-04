"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Scale } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatEventShowNumber } from "@/lib/event-show-number";
import { JudgeBallotQuickVote } from "@/components/judge/judge-ballot-quick-vote";

type AssignmentEvent = {
  eventId: string;
  eventName: string;
  showNumber: number | null;
  startDate: string;
  openBallotCategoryCount: number;
  scoreSheetAssignmentCount: number;
  scoreSheetPendingCount: number;
};

export function JudgeAssignmentsList() {
  const [events, setEvents] = useState<AssignmentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/judge/assignments", {
          credentials: "same-origin",
        });
        const data = (await res.json()) as {
          events?: AssignmentEvent[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Failed to load assignments.");
        setEvents(data.events ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        Loading judging assignments…
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

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Scale className="size-5" aria-hidden />
            No judge ballot assignments
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          You are not assigned as a judge on any event with active ballot or score
          sheet judging work yet. Ask the event organizer to add you as a judge and
          configure judging classes/categories.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((ev) => (
        <div key={ev.eventId} className="rounded-lg border p-3">
          <p className="font-semibold text-foreground">{ev.eventName}</p>
          <p className="text-xs font-normal text-muted-foreground">
            {ev.showNumber != null
              ? `Show #${formatEventShowNumber(ev.showNumber)} · `
              : ""}
            {new Date(ev.startDate).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <JudgeBallotQuickVote eventId={ev.eventId} />
          <div
            className={cn(
              "mt-3 grid gap-2",
              ev.scoreSheetAssignmentCount > 0 ? "sm:grid-cols-2" : "sm:grid-cols-1",
            )}
          >
            <Link
              href={`/judge/events/${ev.eventId}/ballot`}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-auto flex-col items-start gap-1 px-3 py-3 text-left",
              )}
            >
              <span className="text-sm font-semibold text-foreground">
                Judge Ballot Voting
              </span>
              <span className="text-xs font-normal text-primary">
                {ev.openBallotCategoryCount > 0
                  ? `${ev.openBallotCategoryCount} open`
                  : "View categories"}
              </span>
            </Link>
            {ev.scoreSheetAssignmentCount > 0 ? (
              <Link
                href={`/judge/events/${ev.eventId}/score-sheets`}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-auto flex-col items-start gap-1 px-3 py-3 text-left",
                )}
              >
                <span className="text-sm font-semibold text-foreground">
                  My Judging — Score Sheets
                </span>
                <span className="text-xs font-normal text-primary">
                  {ev.scoreSheetPendingCount} pending of{" "}
                  {ev.scoreSheetAssignmentCount}
                </span>
              </Link>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

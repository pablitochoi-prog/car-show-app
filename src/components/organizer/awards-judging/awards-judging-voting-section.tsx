"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  MessageSquare,
  Trophy,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ContextualHelpLink } from "@/components/help/contextual-help-link";
import { EventVotingControls } from "@/components/organizer/awards-judging/event-voting-controls";
import { VotingMethodCta } from "@/components/organizer/awards-judging/voting-method-cta";
import { EventVotingEnabledTag } from "@/components/organizer/awards-judging/event-voting-enabled-tag";
import { ReportVotingStatusTag } from "@/components/organizer/reports/report-voting-status-tag";
import type { EventVotingControlSnapshot } from "@/lib/judging/event-voting-control-types";
import {
  isVotingMethodEnabledForEvent,
  methodVotingReportStatus,
  type EventVotingMethodId,
} from "@/lib/event-reports/voting-method-status-shared";
import type { AwardsJudgingHubStats } from "@/components/organizer/awards-judging/awards-judging-hub";

type JudgingHubTile = {
  id: EventVotingMethodId;
  title: string;
  votingMethod: string;
  description: string;
  href: (eventId: string) => string;
  resultsHref: (eventId: string) => string;
  icon: typeof MessageSquare;
};

const TILES: JudgingHubTile[] = [
  {
    id: "public-voting",
    title: "Public Voting",
    votingMethod: "Public Vote",
    description:
      "Attendee SMS and QR voting. Separate from judge workflows.",
    href: (eventId) =>
      `/organizer/events/${eventId}/awards-judging/public-voting`,
    resultsHref: (eventId) =>
      `/organizer/events/${eventId}/awards-judging/public-voting/results`,
    icon: MessageSquare,
  },
  {
    id: "judge-ballot",
    title: "Judge Ballot Voting",
    votingMethod: "Assigned Judge Ballot",
    description:
      "Judges vote for favorite vehicles per award category (Best Paint, President's Choice, etc.).",
    href: (eventId) => `/organizer/events/${eventId}/awards-judging/ballot`,
    resultsHref: (eventId) =>
      `/organizer/events/${eventId}/awards-judging/ballot/results`,
    icon: Trophy,
  },
  {
    id: "score-sheets",
    title: "Score Sheet Judging",
    votingMethod: "Score Sheet Judging",
    description:
      "Structured judge score sheets by vehicle class using event-specific judging templates.",
    href: (eventId) =>
      `/organizer/events/${eventId}/awards-judging/score-sheets`,
    resultsHref: (eventId) =>
      `/organizer/events/${eventId}/awards-judging/score-sheets/results`,
    icon: ClipboardCheck,
  },
];

const TILE_HELP_SLUGS: Partial<Record<JudgingHubTile["id"], string>> = {
  "public-voting": "setup-public-voting",
  "judge-ballot": "setup-judge-ballot-voting",
  "score-sheets": "setup-score-sheet-judging",
};

function tileBadge(
  tileId: JudgingHubTile["id"],
  stats: AwardsJudgingHubStats,
): string | null {
  switch (tileId) {
    case "public-voting":
      if (stats.publicVotingEnabled && stats.publicVotingCategoryCount > 0) {
        return `${stats.publicVotingCategoryCount} active`;
      }
      return stats.publicVotingCategoryCount > 0 ? "Configured" : null;
    case "judge-ballot":
      if (stats.ballotCategoryCount === 0) return null;
      return stats.openBallotCategoryCount > 0
        ? `${stats.openBallotCategoryCount} open`
        : `${stats.ballotCategoryCount} award categor${stats.ballotCategoryCount === 1 ? "y" : "ies"}`;
    case "score-sheets":
      return stats.scoreSheetTemplateCount > 0
        ? `${stats.scoreSheetTemplateCount} template${stats.scoreSheetTemplateCount === 1 ? "" : "s"}`
        : null;
    default:
      return null;
  }
}

export function AwardsJudgingVotingSection({
  eventId,
  stats,
  initialVotingSnapshot = null,
  isSiteAdmin = false,
}: {
  eventId: string;
  stats: AwardsJudgingHubStats;
  initialVotingSnapshot?: EventVotingControlSnapshot | null;
  isSiteAdmin?: boolean;
}) {
  const [snapshot, setSnapshot] = useState(initialVotingSnapshot);

  useEffect(() => {
    setSnapshot(initialVotingSnapshot);
  }, [initialVotingSnapshot]);

  return (
    <div className="space-y-6">
      <EventVotingControls
        eventId={eventId}
        initialSnapshot={snapshot}
        isSiteAdmin={isSiteAdmin}
        onSnapshotChange={setSnapshot}
      />

      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Terminology</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <span className="font-medium text-foreground">Vehicle Class</span>{" "}
            — registration category (e.g. Full Classic, Modified)
          </li>
          <li>
            <span className="font-medium text-foreground">Judge ballot voting</span>{" "}
            — one voting category per vehicle class you enable below
          </li>
          <li>
            <span className="font-medium text-foreground">Voting Method</span>{" "}
            — how votes or scores are collected
          </li>
        </ul>
      </div>

      {stats.eventVotingFinalized && stats.trophyCount > 0 ? (
        <Card className="border-amber-200/80 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-5 text-amber-600" aria-hidden />
              Awards / Trophy Winners
            </CardTitle>
            <CardDescription>
              Review winners by award, manually exclude a winner to promote the
              next alternate, and use Show winners only at the ceremony.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link
              href={`/organizer/events/${eventId}/awards-judging/trophy-winners`}
              className={cn(buttonVariants(), "w-full justify-center sm:w-auto")}
            >
              Awards / Trophy Winners
            </Link>
          </CardFooter>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          const badge = tileBadge(tile.id, stats);
          const votingStatus = snapshot
            ? methodVotingReportStatus(tile.id, snapshot)
            : "not_started";
          const enabledForEvent = snapshot
            ? isVotingMethodEnabledForEvent(tile.id, snapshot)
            : false;
          return (
            <Card key={tile.id} className="flex flex-col">
              <CardHeader>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="size-5 shrink-0" aria-hidden />
                      {tile.title}
                    </CardTitle>
                    {badge ? (
                      <Badge variant="secondary" className="shrink-0">
                        {badge}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex w-full items-center justify-between gap-2">
                    <EventVotingEnabledTag enabled={enabledForEvent} />
                    <ReportVotingStatusTag status={votingStatus} />
                  </div>
                </div>
                <CardDescription>
                  <span className="not-italic font-medium text-foreground/80">
                    Voting Method: {tile.votingMethod}
                  </span>
                  <span className="mt-1 block">{tile.description}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1" />
              <CardFooter className="flex flex-col gap-2">
                <Link
                  href={tile.href(eventId)}
                  className={cn(buttonVariants(), "w-full justify-center")}
                >
                  Configure
                </Link>
                <VotingMethodCta
                  eventId={eventId}
                  method={tile.id}
                  snapshot={snapshot}
                  configured={enabledForEvent}
                  onSnapshotChange={setSnapshot}
                />
                <Link
                  href={tile.resultsHref(eventId)}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full justify-center",
                  )}
                >
                  View Results
                </Link>
                {TILE_HELP_SLUGS[tile.id] ? (
                  <ContextualHelpLink
                    slug={TILE_HELP_SLUGS[tile.id]!}
                    className="pt-1 text-center"
                  />
                ) : null}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

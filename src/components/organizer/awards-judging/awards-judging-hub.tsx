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

import { EventVotingControls } from "@/components/organizer/awards-judging/event-voting-controls";
import type { EventVotingControlSnapshot } from "@/lib/judging/event-voting-control";

export type AwardsJudgingHubStats = {
  publicVotingEnabled: boolean;
  publicVotingCategoryCount: number;
  ballotCategoryCount: number;
  openBallotCategoryCount: number;
  scoreSheetTemplateCount: number;
  eventVotingFinalized: boolean;
  trophyCount: number;
};

type JudgingHubTile = {
  id: string;
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

export function AwardsJudgingHub({
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
  return (
    <div className="space-y-6">
      <EventVotingControls
        eventId={eventId}
        initialSnapshot={initialVotingSnapshot}
        isSiteAdmin={isSiteAdmin}
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
          return (
            <Card key={tile.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="size-5 shrink-0" aria-hidden />
                    {tile.title}
                  </CardTitle>
                  {badge ? <Badge variant="secondary">{badge}</Badge> : null}
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
                <Link
                  href={tile.resultsHref(eventId)}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full justify-center",
                  )}
                >
                  View Results
                </Link>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

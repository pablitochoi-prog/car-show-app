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

export type AwardsJudgingHubStats = {
  publicVotingEnabled: boolean;
  publicVotingCategoryCount: number;
  ballotCategoryCount: number;
  openBallotCategoryCount: number;
  scoreSheetTemplateCount: number;
};

const TILES = [
  {
    id: "public-voting",
    title: "Public Voting",
    votingMethod: "Public Vote",
    description:
      "Attendee SMS and QR voting. Separate from judge workflows.",
    href: (eventId: string) =>
      `/organizer/events/${eventId}/awards-judging/public-voting`,
    icon: MessageSquare,
  },
  {
    id: "judge-ballot",
    title: "Judge Ballot Awards",
    votingMethod: "Assigned Judge Ballot",
    description:
      "Judges allocate vote blocks to favorite vehicles per award category (Best Paint, Best in Show, etc.).",
    href: (eventId: string) =>
      `/organizer/events/${eventId}/awards-judging/ballot`,
    icon: Trophy,
  },
  {
    id: "score-sheets",
    title: "Score Sheet Judging",
    votingMethod: "Score Sheet Judging",
    description:
      "Structured judge score sheets by vehicle class using event-specific judging templates.",
    href: (eventId: string) =>
      `/organizer/events/${eventId}/awards-judging/score-sheets`,
    resultsHref: (eventId: string) =>
      `/organizer/events/${eventId}/awards-judging/score-sheets/results`,
    icon: ClipboardCheck,
  },
] as const;

function tileBadge(
  tileId: (typeof TILES)[number]["id"],
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
}: {
  eventId: string;
  stats: AwardsJudgingHubStats;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Terminology</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <span className="font-medium text-foreground">Vehicle Class</span>{" "}
            — registration category (e.g. Full Classic, Modified)
          </li>
          <li>
            <span className="font-medium text-foreground">Award Category</span>{" "}
            — judge-voted award (e.g. Best Paint, Best in Show)
          </li>
          <li>
            <span className="font-medium text-foreground">Voting Method</span>{" "}
            — how votes or scores are collected
          </li>
        </ul>
      </div>

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
                {"resultsHref" in tile && tile.resultsHref ? (
                  <Link
                    href={tile.resultsHref(eventId)}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "w-full justify-center",
                    )}
                  >
                    View Results
                  </Link>
                ) : null}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

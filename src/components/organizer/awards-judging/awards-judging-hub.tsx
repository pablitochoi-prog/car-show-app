import type { EventVotingControlSnapshot } from "@/lib/judging/event-voting-control-types";
import { AwardsJudgingVotingSection } from "@/components/organizer/awards-judging/awards-judging-voting-section";

export type AwardsJudgingHubStats = {
  publicVotingEnabled: boolean;
  publicVotingCategoryCount: number;
  ballotCategoryCount: number;
  openBallotCategoryCount: number;
  scoreSheetTemplateCount: number;
  eventVotingFinalized: boolean;
  trophyCount: number;
};

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
      <AwardsJudgingVotingSection
        eventId={eventId}
        stats={stats}
        initialVotingSnapshot={initialVotingSnapshot}
        isSiteAdmin={isSiteAdmin}
      />
    </div>
  );
}

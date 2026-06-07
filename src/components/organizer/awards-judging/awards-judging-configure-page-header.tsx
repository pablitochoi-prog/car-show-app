import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { ReportVotingStatusTag } from "@/components/organizer/reports/report-voting-status-tag";
import { formatEventShowNumber } from "@/lib/event-show-number";
import {
  methodVotingReportStatus,
  type EventVotingMethodId,
} from "@/lib/event-reports/voting-method-status-shared";
import { loadEventVotingControl } from "@/lib/judging/event-voting-control";

type Props = {
  eventId: string;
  name: string;
  showNumber: number;
  /** Short method label in the eyebrow, e.g. "Public Vote". */
  votingMethodLabel: string;
  /** Title beside the status tag, e.g. "Public Voting (SMS / QR)". */
  methodTitle: string;
  method: EventVotingMethodId;
};

export async function AwardsJudgingConfigurePageHeader({
  eventId,
  name,
  showNumber,
  votingMethodLabel,
  methodTitle,
  method,
}: Props) {
  const snapshot = await loadEventVotingControl(eventId);
  const status = snapshot
    ? methodVotingReportStatus(method, snapshot)
    : "not_started";

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Show #{formatEventShowNumber(showNumber)} · Voting Method:{" "}
        {votingMethodLabel}
      </p>
      <h1 className="font-heading text-2xl font-bold">
        <EventNameWithNumber name={name} showNumber={showNumber} />
      </h1>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className="text-muted-foreground">{methodTitle}</p>
        <ReportVotingStatusTag status={status} variant="configure" />
      </div>
    </div>
  );
}

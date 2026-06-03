import Link from "next/link";
import { JudgeAssignedScorecardScreen } from "@/components/judge/judge-assigned-scorecard-screen";

type Props = { params: Promise<{ id: string; sheetId: string }> };

export default async function JudgeScoreSheetDetailPage({ params }: Props) {
  const { id: eventId, sheetId } = await params;

  return (
    <div className="space-y-4">
      <Link
        href={`/judge/events/${eventId}/score-sheets`}
        className="text-sm text-muted-foreground underline"
      >
        Back to score sheets
      </Link>
      <JudgeAssignedScorecardScreen eventId={eventId} sheetId={sheetId} />
    </div>
  );
}

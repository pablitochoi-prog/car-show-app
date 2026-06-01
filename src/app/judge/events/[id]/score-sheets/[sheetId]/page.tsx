import Link from "next/link";
import { JudgeScoreSheetScreen } from "@/components/judge/judge-score-sheet-screen";

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
      <JudgeScoreSheetScreen eventId={eventId} sheetId={sheetId} />
    </div>
  );
}

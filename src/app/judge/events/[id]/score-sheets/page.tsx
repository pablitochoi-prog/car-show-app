import Link from "next/link";
import { JudgeScoreSheetClassList } from "@/components/judge/judge-score-sheet-class-list";

type Props = { params: Promise<{ id: string }> };

export default async function JudgeEventScoreSheetsPage({ params }: Props) {
  const { id: eventId } = await params;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/judge" className="text-sm text-muted-foreground underline">
          Back to assignments
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Score Sheet Judging</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a class and vehicle to start or resume judging
        </p>
      </div>
      <JudgeScoreSheetClassList eventId={eventId} />
    </div>
  );
}

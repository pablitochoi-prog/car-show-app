import Link from "next/link";
import { ContextualHelpLink } from "@/components/help/contextual-help-link";
import { JudgeAssignedVehicleList } from "@/components/judge/judge-assigned-vehicle-list";

type Props = { params: Promise<{ id: string }> };

export default async function JudgeEventScoreSheetsPage({ params }: Props) {
  const { id: eventId } = await params;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/judge" className="text-sm text-muted-foreground underline">
          Back to My Judging
        </Link>
        <h1 className="mt-2 text-2xl font-bold">My Judging — Score Sheets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vehicles and categories assigned to you
        </p>
        <ContextualHelpLink
          slug="complete-score-sheet-judging"
          className="mt-2"
        />
      </div>
      <JudgeAssignedVehicleList eventId={eventId} />
    </div>
  );
}

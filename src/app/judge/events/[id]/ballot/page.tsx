import Link from "next/link";
import { JudgeBallotCategoryList } from "@/components/judge/judge-ballot-category-list";

type Props = { params: Promise<{ id: string }> };

export default async function JudgeEventBallotPage({ params }: Props) {
  const { id: eventId } = await params;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/judge" className="text-sm text-muted-foreground underline">
          Back to My Judging
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Judge Ballot Voting</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select an award category to vote
        </p>
      </div>
      <JudgeBallotCategoryList eventId={eventId} />
    </div>
  );
}

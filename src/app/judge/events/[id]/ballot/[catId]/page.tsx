import Link from "next/link";
import { JudgeBallotVotingScreen } from "@/components/judge/judge-ballot-voting-screen";

type Props = { params: Promise<{ id: string; catId: string }> };

export default async function JudgeBallotCategoryPage({ params }: Props) {
  const { id: eventId, catId } = await params;

  return (
    <div className="space-y-4">
      <Link
        href={`/judge/events/${eventId}/ballot`}
        className="text-sm text-muted-foreground underline"
      >
        Back to award categories
      </Link>
      <JudgeBallotVotingScreen eventId={eventId} categoryId={catId} />
    </div>
  );
}

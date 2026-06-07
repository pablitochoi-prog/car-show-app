import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canManageScoreSheetJudging } from "@/lib/judging/score-sheet-judging-period-auth";
import { requireStaffStepUpPage } from "@/lib/require-organizer-step-up";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { EventOrganizerNavBar } from "@/components/organizer/event-organizer-nav-bar";
import { OrganizerScoreSheetIndividualPicker } from "@/components/organizer/awards-judging/organizer-score-sheet-individual-picker";
import { formatEventShowNumber } from "@/lib/event-show-number";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default async function ScoreSheetIndividualPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id: eventId } = await params;

  await requireStaffStepUpPage({
    user,
    pathname: `/organizer/events/${eventId}/awards-judging/score-sheets/results/individual`,
  });

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, showNumber: true, orgId: true },
  });
  if (!event) notFound();

  const allowed = await canManageScoreSheetJudging(
    user.id,
    eventId,
    user.platformRole,
  );
  if (!allowed) notFound();

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div>
        <p className="text-sm text-muted-foreground">
          Show #{formatEventShowNumber(event.showNumber)} · Score Sheet Judging ·
          Individual score sheets
        </p>
        <h1 className="font-heading text-2xl font-bold">
          <EventNameWithNumber name={event.name} showNumber={event.showNumber} />
        </h1>
        <p className="mt-1 text-muted-foreground">
          Open read-only judge score sheets for one vehicle
        </p>
      </div>

      <EventOrganizerNavBar eventId={eventId} active="awards-judging" user={user} />

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/organizer/events/${eventId}/awards-judging/score-sheets/results`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← Class results
        </Link>
      </div>

      <OrganizerScoreSheetIndividualPicker eventId={eventId} />

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href={`/organizer/events/${eventId}/awards-judging`}
          className="underline"
        >
          Back to Awards &amp; Judging
        </Link>
      </p>
    </div>
  );
}

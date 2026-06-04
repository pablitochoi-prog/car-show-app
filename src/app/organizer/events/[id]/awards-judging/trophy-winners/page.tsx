import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { requireStaffStepUpPage } from "@/lib/require-organizer-step-up";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { EventOrganizerNavBar } from "@/components/organizer/event-organizer-nav-bar";
import { formatEventShowNumber } from "@/lib/event-show-number";
import { AwardTrophyWinnersAdmin } from "@/components/organizer/awards-judging/award-trophy-winners-admin";
import { loadAwardTrophyWinners } from "@/lib/judging/award-trophy-winners";
import { canManageScoreSheetJudging } from "@/lib/judging/score-sheet-judging-period-auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default async function AwardTrophyWinnersPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id: eventId } = await params;

  await requireStaffStepUpPage({
    user,
    pathname: `/organizer/events/${eventId}/awards-judging/trophy-winners`,
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

  const manageAllowed = await canManageEvent(
    user.id,
    eventId,
    event.orgId,
    user.platformRole,
  );
  if (!manageAllowed) notFound();

  let initialPayload = null;
  let initialLoadError: string | null = null;
  try {
    initialPayload = await loadAwardTrophyWinners(eventId);
  } catch {
    initialLoadError =
      "Could not load trophy winners. Run database migrations if this is a new install.";
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <p className="text-sm text-muted-foreground">
          Show #{formatEventShowNumber(event.showNumber)}
        </p>
        <h1 className="font-heading text-2xl font-bold">
          <EventNameWithNumber name={event.name} showNumber={event.showNumber} />
        </h1>
        <p className="mt-1 text-muted-foreground">
          Review winners by award — ranked highest to lowest, with ceremony view
        </p>
      </div>

      <EventOrganizerNavBar eventId={eventId} active="awards-judging" user={user} />

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href={`/organizer/events/${eventId}/awards-judging`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          ← Awards &amp; Judging
        </Link>
        <Link
          href={`/organizer/events/${eventId}/awards-judging/score-sheets/results`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          View Results
        </Link>
      </div>

      <AwardTrophyWinnersAdmin
        eventId={eventId}
        initialPayload={initialPayload}
        initialLoadError={initialLoadError}
      />
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { requireStaffStepUpPage } from "@/lib/require-organizer-step-up";
import { EventOrganizerNavBar } from "@/components/organizer/event-organizer-nav-bar";
import { AwardsJudgingConfigurePageHeader } from "@/components/organizer/awards-judging/awards-judging-configure-page-header";
import { ScoreSheetJudgingAdmin } from "@/components/organizer/awards-judging/score-sheet-judging-admin";

type Props = { params: Promise<{ id: string }> };

export default async function ScoreSheetJudgingSetupPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id: eventId } = await params;

  await requireStaffStepUpPage({
    user,
    pathname: `/organizer/events/${eventId}/awards-judging/score-sheets`,
  });

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, showNumber: true, orgId: true },
  });
  if (!event) notFound();

  const allowed = await canManageEvent(
    user.id,
    eventId,
    event.orgId,
    user.platformRole,
  );
  if (!allowed) notFound();

  const vehicleClasses = await prisma.eventCategory.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      customName: true,
      category: { select: { name: true } },
    },
  });

  const classOptions = vehicleClasses.map((ec) => ({
    id: ec.id,
    label: ec.customName?.trim() || ec.category?.name || "Vehicle Class",
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <AwardsJudgingConfigurePageHeader
        eventId={eventId}
        name={event.name}
        showNumber={event.showNumber}
        votingMethodLabel="Score Sheet Judging"
        methodTitle="Score Sheet Judging"
        method="score-sheets"
      />

      <EventOrganizerNavBar eventId={eventId} active="awards-judging" user={user} />

      <ScoreSheetJudgingAdmin eventId={eventId} vehicleClasses={classOptions} />

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

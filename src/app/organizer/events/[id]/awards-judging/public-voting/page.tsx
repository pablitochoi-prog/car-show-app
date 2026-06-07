import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { requireStaffStepUpPage } from "@/lib/require-organizer-step-up";
import { EventOrganizerNavBar } from "@/components/organizer/event-organizer-nav-bar";
import { AwardsJudgingConfigurePageHeader } from "@/components/organizer/awards-judging/awards-judging-configure-page-header";
import { EventSmsVotingSettings } from "@/components/sms/event-sms-voting-settings";
import { parseDailyHours } from "@/lib/daily-hours";

type Props = { params: Promise<{ id: string }> };

export default async function PublicVotingSetupPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id: eventId } = await params;

  await requireStaffStepUpPage({
    user,
    pathname: `/organizer/events/${eventId}/awards-judging/public-voting`,
  });

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      showNumber: true,
      orgId: true,
      startDate: true,
      endDate: true,
      startTime: true,
      endTime: true,
      dailyHours: true,
      state: true,
    },
  });
  if (!event) notFound();

  const allowed = await canManageEvent(
    user.id,
    eventId,
    event.orgId,
    user.platformRole,
  );
  if (!allowed) notFound();

  const eventSchedule = {
    startDate: event.startDate.toISOString(),
    endDate: event.endDate?.toISOString() ?? null,
    startTime: event.startTime,
    endTime: event.endTime,
    dailyHours: parseDailyHours(event.dailyHours),
    venueState: event.state,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <AwardsJudgingConfigurePageHeader
        eventId={eventId}
        name={event.name}
        showNumber={event.showNumber}
        votingMethodLabel="Public Vote"
        methodTitle="Public Voting (SMS / QR)"
        method="public-voting"
      />

      <EventOrganizerNavBar eventId={eventId} active="awards-judging" user={user} />

      <EventSmsVotingSettings eventId={eventId} eventSchedule={eventSchedule} />

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

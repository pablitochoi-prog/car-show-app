import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { requireStaffStepUpPage } from "@/lib/require-organizer-step-up";
import { getEventStaffList } from "@/lib/event-staff";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { EventOrganizerNav } from "@/components/organizer/event-organizer-nav";
import { JudgeBallotAdmin } from "@/components/organizer/awards-judging/judge-ballot-admin";
import { formatEventShowNumber } from "@/lib/event-show-number";

type Props = { params: Promise<{ id: string }> };

export default async function JudgeBallotAdminPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id: eventId } = await params;

  await requireStaffStepUpPage({
    user,
    pathname: `/organizer/events/${eventId}/awards-judging/ballot`,
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

  const [vehicleClasses, staff] = await Promise.all([
    prisma.eventCategory.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        customName: true,
        category: { select: { name: true } },
      },
    }),
    getEventStaffList(eventId),
  ]);

  const eventJudges = staff
    .filter((m) => m.roles.some((r) => r.slug === "judge"))
    .map((m) => ({
      userId: m.userId,
      name: m.name,
      email: m.email,
    }));

  const classOptions = vehicleClasses.map((ec) => ({
    id: ec.id,
    label: ec.customName?.trim() || ec.category?.name || "Vehicle Class",
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <p className="text-sm text-muted-foreground">
          Show #{formatEventShowNumber(event.showNumber)} · Voting Method: Assigned Judge Ballot
        </p>
        <h1 className="font-heading text-2xl font-bold">
          <EventNameWithNumber name={event.name} showNumber={event.showNumber} />
        </h1>
        <p className="mt-1 text-muted-foreground">
          Judge Ballot Award Categories — judges allocate votes per award category
        </p>
      </div>

      <EventOrganizerNav eventId={eventId} active="awards-judging" />

      <JudgeBallotAdmin
        eventId={eventId}
        vehicleClasses={classOptions}
        eventJudges={eventJudges}
      />

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

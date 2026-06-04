import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireStaffStepUpPage } from "@/lib/require-organizer-step-up";
import { canManageVehicleRegistrations } from "@/lib/vehicle-registrations-auth";
import { EventOrganizerNavBar } from "@/components/organizer/event-organizer-nav-bar";
import { ScoreSheetJudgeAssignments } from "@/components/organizer/awards-judging/score-sheet-judge-assignments";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function ScoreSheetAssignmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id: eventId } = await params;

  await requireStaffStepUpPage({
    user,
    pathname: `/organizer/events/${eventId}/awards-judging/score-sheets/assignments`,
  });

  const allowed = await canManageVehicleRegistrations(
    user.id,
    eventId,
    user.platformRole,
  );
  if (!allowed) notFound();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { name: true, showNumber: true },
  });
  if (!event) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <EventOrganizerNavBar eventId={eventId} active="awards-judging" user={user} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Judge assignments</h1>
          <p className="text-sm text-muted-foreground">{event.name}</p>
        </div>
        <Link
          href={`/organizer/events/${eventId}/awards-judging/score-sheets`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Back to score sheets
        </Link>
      </div>
      <ScoreSheetJudgeAssignments eventId={eventId} />
    </div>
  );
}

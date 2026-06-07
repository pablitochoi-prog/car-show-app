import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { requireStaffStepUpPage } from "@/lib/require-organizer-step-up";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { EventOrganizerNavBar } from "@/components/organizer/event-organizer-nav-bar";
import { OrganizerScoreSheetVehicleDetail } from "@/components/organizer/awards-judging/organizer-score-sheet-vehicle-detail";
import { formatEventShowNumber } from "@/lib/event-show-number";

type Props = {
  params: Promise<{ id: string; vehicleEntryCode: string }>;
  searchParams: Promise<{ judgingClassId?: string }>;
};

export default async function ScoreSheetVehicleDetailPage({
  params,
  searchParams,
}: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id: eventId, vehicleEntryCode } = await params;
  const { judgingClassId } = await searchParams;
  if (!judgingClassId?.trim()) notFound();

  const decodedEntry = decodeURIComponent(vehicleEntryCode);

  await requireStaffStepUpPage({
    user,
    pathname: `/organizer/events/${eventId}/awards-judging/score-sheets/results/vehicle/${vehicleEntryCode}`,
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

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 print:max-w-none print:py-4">
      <div className="print:hidden">
        <p className="text-sm text-muted-foreground">
          Show #{formatEventShowNumber(event.showNumber)} · Score Sheet Judging · Judge
          sheets
        </p>
        <h1 className="font-heading text-2xl font-bold">
          <EventNameWithNumber name={event.name} showNumber={event.showNumber} />
        </h1>
        <p className="mt-1 text-muted-foreground">
          Read-only judge score sheets for {decodedEntry}
        </p>
      </div>

      <div className="print:hidden">
        <EventOrganizerNavBar eventId={eventId} active="awards-judging" user={user} />
      </div>

      <OrganizerScoreSheetVehicleDetail
        eventId={eventId}
        judgingClassId={judgingClassId.trim()}
        vehicleEntryCode={decodedEntry}
      />

      <p className="text-center text-sm text-muted-foreground print:hidden">
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

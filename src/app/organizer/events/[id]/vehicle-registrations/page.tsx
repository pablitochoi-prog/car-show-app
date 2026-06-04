import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireStaffStepUpPage } from "@/lib/require-organizer-step-up";
import { canManageVehicleRegistrations } from "@/lib/vehicle-registrations-auth";
import { EventOrganizerNavBar } from "@/components/organizer/event-organizer-nav-bar";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { VehicleRegistrationsWorkspace } from "@/components/organizer/vehicle-registrations-workspace";

export default async function EventVehicleRegistrationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id: eventId } = await params;

  await requireStaffStepUpPage({
    user,
    pathname: `/organizer/events/${eventId}/vehicle-registrations`,
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
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <EventNameWithNumber
          name={event.name}
          showNumber={event.showNumber}
          className="text-2xl font-semibold tracking-tight"
        />
        <p className="text-sm text-muted-foreground">
          Review registered vehicles and assign event judges to scorecard categories.
        </p>
      </div>

      <EventOrganizerNavBar
        eventId={eventId}
        active="vehicle-registrations"
        user={user}
      />

      <h2 className="text-lg font-medium">Vehicle registrations</h2>

      <VehicleRegistrationsWorkspace eventId={eventId} />
    </div>
  );
}

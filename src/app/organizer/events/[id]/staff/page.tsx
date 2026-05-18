import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, canManageEventAndLoad } from "@/lib/auth";
import { getEventStaffList, listEventRoleDefinitions } from "@/lib/event-staff";
import { EventStaffManager } from "@/components/forms/event-staff-manager";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";

export default async function EventStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id: eventId } = await params;
  const { allowed, event } = await canManageEventAndLoad(
    user.id,
    eventId,
    user.platformRole,
  );
  if (!allowed || !event) notFound();

  const [staff, staffRoleDefinitions] = await Promise.all([
    getEventStaffList(eventId),
    listEventRoleDefinitions(eventId),
  ]);

  return (
    <div className="page-shell max-w-3xl space-y-6">
      <div className="page-head">
        <Link
          href={`/organizer/events/${eventId}/edit`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to event
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Event Staff —{" "}
          <EventNameWithNumber
            name={event.name}
            showNumber={event.showNumber}
          />
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add or remove team members and assign event-specific roles. Each role
          grants different permissions scoped to this event only.
        </p>
      </div>

      <EventStaffManager
        key={eventId}
        eventId={eventId}
        initialStaff={staff}
        initialRoleDefinitions={staffRoleDefinitions}
      />
    </div>
  );
}

import type { User } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { canManageVehicleRegistrations } from "@/lib/vehicle-registrations-auth";
import {
  EventOrganizerNav,
  type EventOrganizerNavTab,
} from "@/components/organizer/event-organizer-nav";

type Props = {
  eventId: string;
  active: EventOrganizerNavTab;
  className?: string;
  /** Pass the same user as the page guard so nav access matches page access. */
  user?: Pick<User, "id" | "platformRole"> | null;
};

export async function EventOrganizerNavBar({
  eventId,
  active,
  className,
  user: userProp,
}: Props) {
  const user = userProp ?? (await getCurrentUser());
  const showVehicleRegistrationsTab =
    user != null &&
    (await canManageVehicleRegistrations(user.id, eventId, user.platformRole));

  return (
    <EventOrganizerNav
      eventId={eventId}
      active={active}
      className={className}
      showVehicleRegistrationsTab={showVehicleRegistrationsTab}
    />
  );
}

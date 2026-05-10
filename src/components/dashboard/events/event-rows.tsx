import Link from "next/link";
import type { EventStatus, RegistrationStatus } from "@prisma/client";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StaffRoleBadgeRow } from "@/lib/event-role-labels";
import {
  formatEventDateAndStartTime,
  formatEventWhen,
  formatStatusLabel,
} from "./format-event-meta";

export type { StaffRoleBadgeRow };

export type ManagingEventRow = {
  eventId: string;
  name: string;
  startDate: Date;
  startTime: string | null;
  city: string | null;
  state: string | null;
  status: EventStatus;
  roles: StaffRoleBadgeRow[];
};

export type ParticipatingEventRow = {
  registrationId: string;
  eventId: string;
  name: string;
  startDate: Date;
  city: string | null;
  state: string | null;
  eventStatus: EventStatus;
  registrationStatus: RegistrationStatus;
  tierName: string;
  vehicleCount: number;
};

function registrationBadgeVariant(
  s: RegistrationStatus
): "warning" | "success" | "muted" | "danger" {
  if (s === "CONFIRMED") return "success";
  if (s === "PENDING") return "warning";
  if (s === "CANCELLED") return "danger";
  return "muted";
}

export function EmptyManaging({ canCreate = false }: { canCreate?: boolean }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-12 text-center">
      <p className="text-sm text-muted-foreground">
        No staff assignments yet. When an organizer adds you to an event team,
        it will show up here.
      </p>
      {canCreate && (
        <Link
          href="/organizer/events/new"
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "mt-4 inline-flex"
          )}
        >
          Create your own event
        </Link>
      )}
    </div>
  );
}

export function EmptyParticipating() {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-12 text-center">
      <p className="text-sm text-muted-foreground">
        No exhibitor registrations yet. Browse published shows and register your
        vehicles to see them listed here.
      </p>
      <Link
        href="/events"
        className={cn(
          buttonVariants({ variant: "secondary", size: "sm" }),
          "mt-4 inline-flex"
        )}
      >
        Browse events
      </Link>
    </div>
  );
}

export function ManagingCard({ row }: { row: ManagingEventRow }) {
  const roles = row.roles;
  const location =
    row.city && row.state
      ? `${row.city}, ${row.state}`
      : row.city || row.state || "Location TBD";
  const isOrganizer = roles.some((r) => r.slug === "organizer");

  return (
    <li className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-medium tracking-tight">{row.name}</h3>
          <span className="flex flex-wrap gap-1.5">
            {roles.map((r) => (
              <Badge key={r.id} variant="default">
                {r.name}
              </Badge>
            ))}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatEventDateAndStartTime(row.startDate, row.startTime)} ·{" "}
          {location} · {formatStatusLabel(row.status)}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
        {isOrganizer ? (
          <Link
            href={`/organizer/events/${row.eventId}/edit`}
            className={buttonVariants({ size: "sm" })}
          >
            Edit event
          </Link>
        ) : null}
        <Link
          href={`/events/${row.eventId}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          View page
        </Link>
      </div>
    </li>
  );
}

export function ParticipatingCard({ row }: { row: ParticipatingEventRow }) {
  const location =
    row.city && row.state
      ? `${row.city}, ${row.state}`
      : row.city || row.state || "Location TBD";
  const vehicles =
    row.vehicleCount === 0
      ? "No vehicles"
      : row.vehicleCount === 1
        ? "1 vehicle"
        : `${row.vehicleCount} vehicles`;

  return (
    <li className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-medium tracking-tight">{row.name}</h3>
          <Badge variant="outline">Exhibitor</Badge>
          <Badge variant={registrationBadgeVariant(row.registrationStatus)}>
            {formatStatusLabel(row.registrationStatus)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatEventWhen(row.startDate)} · {location} ·{" "}
          {formatStatusLabel(row.eventStatus)}
        </p>
        <p className="text-xs text-muted-foreground">
          Tier: <span className="text-foreground">{row.tierName}</span> ·{" "}
          {vehicles}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
        <Link
          href={`/events/${row.eventId}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Event page
        </Link>
        <Link
          href="/dashboard/registrations"
          className={buttonVariants({ size: "sm" })}
        >
          Registrations
        </Link>
      </div>
    </li>
  );
}

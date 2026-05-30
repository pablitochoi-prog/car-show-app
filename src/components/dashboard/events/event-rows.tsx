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
import { CancelRegistrationButton } from "./cancel-registration-button";
import { EventCardIdentity } from "@/components/events/event-card-identity";
import { RegisteredEventBadge } from "@/components/events/registered-event-badge";
import { EventListingStatusBadge } from "@/components/events/event-listing-status-badge";
import type { EventCardBrandingFields } from "@/lib/event-card-branding";
import type { EventRegistrationSummary } from "@/lib/event-registration-summary";
import { formatMoney } from "@/components/registration/reg-utils";

export type { StaffRoleBadgeRow, EventCardBrandingFields };

export type ManagingEventRow = {
  eventId: string;
  name: string;
  showNumber: number;
  startDate: Date;
  startTime: string | null;
  city: string | null;
  state: string | null;
  status: EventStatus;
  roles: StaffRoleBadgeRow[];
  /** Present when the viewer has the organizer role on this event. */
  organizerStats?: EventRegistrationSummary | null;
} & EventCardBrandingFields;

export type ParticipatingEventRow = {
  registrationId: string;
  eventId: string;
  name: string;
  showNumber: number;
  startDate: Date;
  city: string | null;
  state: string | null;
  eventStatus: EventStatus;
  registrationStatus: RegistrationStatus;
  tierName: string;
  vehicleCount: number;
  paymentLabel: string | null;
  paymentKind: "complete" | "due" | null;
} & EventCardBrandingFields;

function registrationBadgeVariant(
  s: RegistrationStatus
): "warning" | "success" | "muted" | "danger" {
  if (s === "CONFIRMED") return "success";
  if (s === "PENDING") return "warning";
  if (s === "CANCELLED") return "danger";
  return "muted";
}

function OrganizerEventStats({
  summary,
}: {
  summary: EventRegistrationSummary;
}) {
  const feesLabel =
    summary.registrationFeeType === "DONATION"
      ? "Donations"
      : "Reg. fees";

  const items = [
    { label: "Registrations", value: String(summary.registrationCount) },
    { label: "Cars", value: String(summary.totalCars) },
    {
      label: feesLabel,
      value: formatMoney(summary.totalRegistrationFeesCents),
    },
    {
      label: "Collected",
      value: formatMoney(summary.totalCollectedCents),
    },
    {
      label: "Amount due",
      value: formatMoney(summary.totalAmountDueCents),
    },
  ];

  return (
    <dl className="w-full space-y-1 text-xs sm:min-w-[10.5rem]">
      {items.map(({ label, value }) => (
        <div
          key={label}
          className="flex items-baseline justify-between gap-3 border-b border-border/50 pb-1 last:border-0 last:pb-0"
        >
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="shrink-0 font-medium tabular-nums text-foreground">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
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

export function EmptyParticipating({
  message,
}: {
  message?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-12 text-center">
      <p className="text-sm text-muted-foreground">
        {message ??
          "No exhibitor registrations yet. Browse published shows and register your vehicles to see them listed here."}
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

export function ManagingCard({
  row,
  isRegistered = false,
}: {
  row: ManagingEventRow;
  isRegistered?: boolean;
}) {
  const roles = row.roles;
  const location =
    row.city && row.state
      ? `${row.city}, ${row.state}`
      : row.city || row.state || "Location TBD";
  const isOrganizer = roles.some((r) => r.slug === "organizer");
  const canViewRegistrations = roles.some(
    (r) => r.slug === "organizer" || r.slug === "treasurer",
  );

  return (
    <li className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 flex-1 space-y-2">
        <EventCardIdentity
          name={row.name}
          showNumber={row.showNumber}
          logoUrl={row.logoUrl}
          orgName={row.orgName}
          orgLogoUrl={row.orgLogoUrl}
          titleClassName="text-sm font-medium"
          badges={
            <>
              {isRegistered && <RegisteredEventBadge />}
              {roles.map((r) => (
                <Badge key={r.id} variant="default">
                  {r.name}
                </Badge>
              ))}
            </>
          }
        />
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
          <span>
            {formatEventDateAndStartTime(row.startDate, row.startTime)} ·{" "}
            {location}
          </span>
          <span aria-hidden>·</span>
          <EventListingStatusBadge status={row.status} />
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-3 sm:items-end sm:min-w-[10.5rem]">
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {canViewRegistrations ? (
            <Link
              href={`/organizer/events/${row.eventId}/registrations`}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Registrations
            </Link>
          ) : null}
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
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            View page
          </Link>
        </div>
        {canViewRegistrations && row.organizerStats ? (
          <OrganizerEventStats summary={row.organizerStats} />
        ) : null}
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
        <EventCardIdentity
          name={row.name}
          showNumber={row.showNumber}
          logoUrl={row.logoUrl}
          orgName={row.orgName}
          orgLogoUrl={row.orgLogoUrl}
          titleClassName="text-sm font-medium"
          badges={
            <>
              <Badge variant="outline">Exhibitor</Badge>
              {row.registrationStatus !== "CANCELLED" && (
                <RegisteredEventBadge />
              )}
              {row.registrationStatus === "CANCELLED" && (
                <Badge variant={registrationBadgeVariant(row.registrationStatus)}>
                  {formatStatusLabel(row.registrationStatus)}
                </Badge>
              )}
            </>
          }
        />
        <p className="text-xs text-muted-foreground">
          {formatEventWhen(row.startDate)} · {location} ·{" "}
          {formatStatusLabel(row.eventStatus)}
        </p>
        <p className="text-xs text-muted-foreground">
          Tier: <span className="text-foreground">{row.tierName}</span> ·{" "}
          {vehicles}
        </p>
        {row.paymentLabel && (
          <p
            className={cn(
              "text-xs font-medium",
              row.paymentKind === "due"
                ? "text-amber-700 dark:text-amber-300"
                : "text-emerald-700 dark:text-emerald-400",
            )}
          >
            {row.paymentLabel}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
        <Link
          href={`/events/${row.eventId}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Event page
        </Link>
        {row.registrationStatus !== "CANCELLED" && (
          <Link
            href={`/events/${row.eventId}/register/edit`}
            className={buttonVariants({ size: "sm" })}
          >
            Edit Registration
          </Link>
        )}
        {row.registrationStatus !== "CANCELLED" && (
          <CancelRegistrationButton registrationId={row.registrationId} />
        )}
      </div>
    </li>
  );
}

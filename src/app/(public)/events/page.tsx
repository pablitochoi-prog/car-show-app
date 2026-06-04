import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { buildPublishedWhere } from "@/lib/events-queries";
import { getRegisteredEventStatusMapForUser } from "@/lib/user-registered-events";
import { RegistrationStatusBadge } from "@/components/events/registered-event-badge";
import { CancelRegistrationButton } from "@/components/dashboard/events/cancel-registration-button";
import { EventsSearchForm } from "@/components/events/events-search-form";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Calendar,
  DollarSign,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EventCardIdentity,
  EVENT_CARD_META_INDENT_CLASS,
} from "@/components/events/event-card-identity";
import { eventBrandingFromEvent } from "@/lib/event-card-branding";
import { formatUsdDollarsAmount } from "@/lib/money";

function parseDate(v: string | undefined): Date | undefined {
  if (!v?.trim()) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function oneMonthFromToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + 1);
  return d;
}

const EVENT_TYPES: Record<string, string> = {
  car_show: "Car Show",
  cruise_in: "Cruise-in",
  meet: "Meet-up",
  track: "Track / Autocross",
  other: "Other",
};

function feeLabel(type: string | null, dollars: number | null): string {
  if (!type || type === "FREE") return "Free";
  if (type === "DONATION") {
    return dollars != null
      ? `Donation · ${formatUsdDollarsAmount(dollars)} suggested`
      : "Donation";
  }
  if (type === "PAID_TIERED") return "Tiered pricing";
  return dollars != null ? formatUsdDollarsAmount(dollars) : "Paid";
}

function eventTypeBadge(type: string) {
  return EVENT_TYPES[type] ?? type;
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const city = typeof sp.city === "string" ? sp.city : undefined;
  const state = typeof sp.state === "string" ? sp.state : undefined;
  const eventType =
    typeof sp.type === "string" && sp.type !== "all" ? sp.type : undefined;
  const from = parseDate(typeof sp.from === "string" ? sp.from : undefined);
  const to = parseDate(typeof sp.to === "string" ? sp.to : undefined);
  const defaultToDate = oneMonthFromToday();
  const toDateValue = to ?? defaultToDate;

  const hasFilters = !!(city || state || eventType || from || to);

  const viewer = await getCurrentUser();
  const registeredEventMap = viewer
    ? await getRegisteredEventStatusMapForUser(viewer.id)
    : new Map();

  const events = await prisma.event.findMany({
    where: buildPublishedWhere({ q, city, state, eventType, from, to }),
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      name: true,
      showNumber: true,
      city: true,
      state: true,
      startDate: true,
      startTime: true,
      eventType: true,
      registrationFeeType: true,
      registrationFeeDollars: true,
      status: true,
      logoUrl: true,
      organization: { select: { name: true, logo: true } },
    },
  });

  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (city) qs.set("city", city);
  if (state) qs.set("state", state);
  if (eventType) qs.set("type", eventType);
  if (from) qs.set("from", from.toISOString().slice(0, 10));
  if (to) qs.set("to", to.toISOString().slice(0, 10));
  const qsStr = qs.toString();

  return (
    <div className="page-shell max-w-4xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Find Car Shows</h1>
        <p className="mt-2 text-muted-foreground">
          Discover car shows, cruise-ins, and meets near you
        </p>
      </div>

      <EventsSearchForm
        q={q}
        city={city}
        state={state}
        eventType={eventType}
        from={from ? formatDateInput(from) : undefined}
        to={formatDateInput(toDateValue)}
        hasFilters={hasFilters}
        qsStr={qsStr}
      />

      {/* Results count */}
      {(q || hasFilters) && (
        <p className="mb-4 text-sm text-muted-foreground">
          {events.length} event{events.length !== 1 ? "s" : ""} found
          {q ? ` for "${q}"` : ""}
        </p>
      )}

      {/* Event list */}
      {events.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed p-12 text-center">
          <MapPin className="mx-auto mb-4 size-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">No matching events</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Try widening your search or check back later for upcoming shows.
          </p>
          {qsStr && (
            <Link
              href="/events"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}
            >
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((ev) => {
            const fee = feeLabel(ev.registrationFeeType, ev.registrationFeeDollars);
            const location = [ev.city, ev.state].filter(Boolean).join(", ");
            const dateStr = new Date(ev.startDate).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const registrationStatus = registeredEventMap.get(ev.id);
            const branding = eventBrandingFromEvent(ev);

            return (
              <li key={ev.id}>
                <Card className="transition-all hover:bg-accent/30 hover:shadow-md">
                  <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: event info */}
                    <Link href={`/events/${ev.id}`} className="group min-w-0 flex-1 space-y-2">
                      <EventCardIdentity
                        name={ev.name}
                        showNumber={ev.showNumber}
                        logoUrl={branding.logoUrl}
                        orgName={branding.orgName}
                        orgLogoUrl={branding.orgLogoUrl}
                        titleClassName="group-hover:text-primary"
                        badges={
                          <>
                            <Badge variant="secondary">
                              {eventTypeBadge(ev.eventType)}
                            </Badge>
                            {registrationStatus && (
                              <RegistrationStatusBadge
                                label={registrationStatus.label}
                                complete={registrationStatus.complete}
                              />
                            )}
                            {ev.status === "ACTIVE" && (
                              <Badge variant="success">Live</Badge>
                            )}
                          </>
                        }
                      />

                      <div
                        className={cn(
                          "flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground",
                          EVENT_CARD_META_INDENT_CLASS,
                        )}
                      >
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5" />
                          {dateStr}
                          {ev.startTime ? ` · ${ev.startTime}` : ""}
                        </span>
                        {location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3.5" />
                            {location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <DollarSign className="size-3.5" />
                          {fee}
                        </span>
                      </div>
                    </Link>

                    {/* Right: CTAs or arrow */}
                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                      {registrationStatus ? (
                        <>
                          <Link
                            href={`/events/${ev.id}/register/edit`}
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                          >
                            Edit Registration
                          </Link>
                          <CancelRegistrationButton
                            registrationId={registrationStatus.registrationId}
                          />
                        </>
                      ) : (
                        <ChevronRight className="size-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

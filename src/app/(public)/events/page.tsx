import Link from "next/link";
import { prisma } from "@/lib/db";
import { buildPublishedWhere } from "@/lib/events-queries";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Calendar,
  Search,
  SlidersHorizontal,
  DollarSign,
  Clock,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { US_STATES } from "@/lib/us-states";

function parseDate(v: string | undefined): Date | undefined {
  if (!v?.trim()) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
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
    return dollars != null ? `Donation · $${dollars} suggested` : "Donation";
  }
  if (type === "PAID_TIERED") return "Tiered pricing";
  return dollars != null ? `$${dollars}` : "Paid";
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

  const hasFilters = !!(city || state || eventType || from || to);

  const events = await prisma.event.findMany({
    where: buildPublishedWhere({ q, city, state, eventType, from, to }),
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      startDate: true,
      startTime: true,
      eventType: true,
      registrationFeeType: true,
      registrationFeeDollars: true,
      status: true,
      organization: { select: { name: true } },
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

      <form method="get" className="mb-8 space-y-4">
        {/* Primary search bar */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            placeholder="Search by event name, venue, or keyword…"
            defaultValue={q}
            className="h-12 pl-10 text-base"
          />
        </div>

        {/* Filters toggle / section */}
        <details open={hasFilters || undefined}>
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <SlidersHorizontal className="size-4" />
            Filters
            {hasFilters && (
              <Badge variant="default" className="ml-1">
                {[city, state, eventType, from, to].filter(Boolean).length}
              </Badge>
            )}
          </summary>

          <div className="mt-4 grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-xs">City</Label>
              <Input
                id="city"
                name="city"
                placeholder="Any city"
                defaultValue={city}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="state" className="text-xs">State</Label>
              <select
                id="state"
                name="state"
                defaultValue={state ?? ""}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
              >
                <option value="">Any state</option>
                {US_STATES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type" className="text-xs">Event Type</Label>
              <select
                id="type"
                name="type"
                defaultValue={eventType ?? "all"}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
              >
                <option value="all">All types</option>
                {Object.entries(EVENT_TYPES).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="from" className="text-xs">From Date</Label>
              <Input
                id="from"
                name="from"
                type="date"
                className="h-9"
                defaultValue={from ? from.toISOString().slice(0, 10) : undefined}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="to" className="text-xs">To Date</Label>
              <Input
                id="to"
                name="to"
                type="date"
                className="h-9"
                defaultValue={to ? to.toISOString().slice(0, 10) : undefined}
              />
            </div>
          </div>
        </details>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" className="gap-2">
            <Search className="size-4" />
            Search
          </Button>
          {qsStr && (
            <Link href="/events" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Clear all filters
            </Link>
          )}
        </div>
      </form>

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

            return (
              <li key={ev.id}>
                <Link href={`/events/${ev.id}`} className="group block">
                  <Card className="transition-all hover:bg-accent/30 hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
                    <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      {/* Left: event info */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-semibold group-hover:text-primary">
                            {ev.name}
                          </h3>
                          <Badge variant="secondary">{eventTypeBadge(ev.eventType)}</Badge>
                          {ev.status === "ACTIVE" && (
                            <Badge variant="success">Live</Badge>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {ev.organization?.name ?? "Independent"}
                        </p>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
                      </div>

                      {/* Right: arrow */}
                      <div className="flex shrink-0 items-center justify-end">
                        <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

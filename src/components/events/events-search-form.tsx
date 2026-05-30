"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { US_STATES } from "@/lib/us-states";

const EVENT_TYPES: Record<string, string> = {
  car_show: "Car Show",
  cruise_in: "Cruise-in",
  meet: "Meet-up",
  track: "Track / Autocross",
  other: "Other",
};

type EventsSearchFormProps = {
  q?: string;
  city?: string;
  state?: string;
  eventType?: string;
  from?: string;
  to?: string;
  hasFilters: boolean;
  qsStr: string;
};

export function EventsSearchForm({
  q,
  city,
  state,
  eventType,
  from,
  to,
  hasFilters,
  qsStr,
}: EventsSearchFormProps) {
  const [searching, setSearching] = useState(false);

  return (
    <form
      method="get"
      className="mb-8 space-y-4"
      onSubmit={() => setSearching(true)}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          placeholder="Search by event name, venue, or keyword…"
          defaultValue={q}
          className="h-12 pl-10 text-base"
          disabled={searching}
        />
      </div>

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
            <Label htmlFor="city" className="text-xs">
              City
            </Label>
            <Input
              id="city"
              name="city"
              placeholder="Any city"
              defaultValue={city}
              className="h-9"
              disabled={searching}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="state" className="text-xs">
              State
            </Label>
            <select
              id="state"
              name="state"
              defaultValue={state ?? ""}
              disabled={searching}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none disabled:opacity-50"
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
            <Label htmlFor="type" className="text-xs">
              Event Type
            </Label>
            <select
              id="type"
              name="type"
              defaultValue={eventType ?? "all"}
              disabled={searching}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none disabled:opacity-50"
            >
              <option value="all">All types</option>
              {Object.entries(EVENT_TYPES).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="from" className="text-xs">
              From Date
            </Label>
            <Input
              id="from"
              name="from"
              type="date"
              className="h-9"
              defaultValue={from}
              disabled={searching}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="to" className="text-xs">
              To Date
            </Label>
            <Input
              id="to"
              name="to"
              type="date"
              className="h-9"
              defaultValue={to}
              disabled={searching}
            />
          </div>
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          className="gap-2"
          disabled={searching}
          aria-busy={searching || undefined}
        >
          {searching ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Search className="size-4" />
          )}
          {searching ? "Searching…" : "Search"}
        </Button>
        {qsStr && !searching && (
          <Link
            href="/events"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Clear all filters
          </Link>
        )}
      </div>
    </form>
  );
}

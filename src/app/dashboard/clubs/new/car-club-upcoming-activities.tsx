"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatEventWhen } from "@/components/dashboard/events/format-event-meta";
import { formatClubEventLocationLine } from "@/lib/club-event-location-line";

type UpcomingEventRow = {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  status: string;
};

export function CarClubUpcomingActivities({
  organizationId,
  embedded = false,
}: {
  organizationId?: string | null;
  /** Hide duplicate headings when nested under Events / Activities. */
  embedded?: boolean;
}) {
  const [events, setEvents] = useState<UpcomingEventRow[] | undefined>(
    undefined
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setError("");
      try {
        const res = await fetch(
          `/api/organizations/${organizationId}/upcoming-events`,
          { credentials: "include" }
        );
        const data = (await res.json()) as {
          error?: string;
          events?: UpcomingEventRow[];
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Could not load activities");
        }
        if (!cancelled) {
          setEvents(data.events ?? []);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Could not load activities"
          );
          setEvents([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return (
    <div className="space-y-2">
      {!embedded ? (
        <>
          <div className="text-sm font-medium leading-none">
            Upcoming activities
          </div>
          <p className="text-xs text-muted-foreground">
            Shows scheduled or ongoing events hosted under this club (not yet
            ended).
          </p>
        </>
      ) : null}
      {!organizationId ? (
        <p className="text-sm text-muted-foreground">
          Save your club first. Events you create and link to this organization will
          appear here.
        </p>
      ) : events === undefined ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {embedded
            ? "No upcoming activities yet."
            : "No upcoming activities yet. Create an event and choose this club as the hosting organization."}
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {events.map((ev) => {
            const loc = formatClubEventLocationLine(ev);
            return (
              <li key={ev.id} className="px-3 py-2.5">
                <Link
                  href={`/events/${ev.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {ev.name}
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatEventWhen(new Date(ev.startDate))}
                  {loc ? ` · ${loc}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

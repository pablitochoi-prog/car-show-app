import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  hrefDashboardEvents,
  type EventsTab,
} from "@/lib/dashboard-events-url";
import { EventsPaginationBar } from "./events-pagination";
import {
  EmptyManaging,
  EmptyParticipating,
  ManagingCard,
  ParticipatingCard,
  type ManagingEventRow,
  type ParticipatingEventRow,
} from "./event-rows";

export type { ManagingEventRow, ParticipatingEventRow };

export function EventsOverview(props: {
  tab: EventsTab;
  page: number;
  pageSize: number;
  managingTotal: number;
  managingRows: ManagingEventRow[];
  participatingTotal: number;
  participatingRows: ParticipatingEventRow[];
  canCreate?: boolean;
}) {
  const {
    tab,
    page,
    pageSize,
    managingTotal,
    managingRows,
    participatingTotal,
    participatingRows,
    canCreate = false,
  } = props;

  const managingActive = tab === "managing";
  const participatingActive = tab === "participating";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/80 bg-card shadow-sm">
        <div className="border-b border-border px-4 pt-4 sm:px-6">
          <nav aria-label="Event categories" className="flex gap-1 sm:gap-2">
            <Link
              href={hrefDashboardEvents("managing", 1)}
              className={cn(
                "relative flex-1 rounded-t-lg px-3 py-2.5 text-center text-sm font-medium transition-colors sm:flex-none sm:px-5",
                managingActive
                  ? "bg-background text-foreground shadow-[inset_0_-2px_0_0_var(--primary)]"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <span className="inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
                Managing
                {managingTotal > 0 ? (
                  <span className="rounded-md bg-muted px-1.5 py-px text-[11px] font-normal tabular-nums text-muted-foreground">
                    {managingTotal}
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground sm:inline sm:mt-0 sm:ml-1.5 sm:text-xs">
                Staff &amp; organizer tools
              </span>
            </Link>
            <Link
              href={hrefDashboardEvents("participating", 1)}
              className={cn(
                "relative flex-1 rounded-t-lg px-3 py-2.5 text-center text-sm font-medium transition-colors sm:flex-none sm:px-5",
                participatingActive
                  ? "bg-background text-foreground shadow-[inset_0_-2px_0_0_var(--primary)]"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <span className="inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
                Participating
                {participatingTotal > 0 ? (
                  <span className="rounded-md bg-muted px-1.5 py-px text-[11px] font-normal tabular-nums text-muted-foreground">
                    {participatingTotal}
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground sm:inline sm:mt-0 sm:ml-1.5 sm:text-xs">
                Exhibiting &amp; attending
              </span>
            </Link>
          </nav>
        </div>

        <div className="px-4 py-5 sm:px-6">
          {managingActive ? (
            <>
              <div className="mb-4">
                <h2 className="text-base font-semibold tracking-tight">
                  Events you&apos;re organizing or supporting
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Roles like organizer, registrar, judge, or marketing appear
                  here. Use{" "}
                  <strong className="font-medium text-foreground">
                    Edit event
                  </strong>{" "}
                  when you&apos;re listed as an organizer.
                </p>
              </div>
              {managingRows.length === 0 ? (
                <EmptyManaging canCreate={canCreate} />
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border/80">
                  {managingRows.map((row) => (
                    <ManagingCard key={row.eventId} row={row} />
                  ))}
                </ul>
              )}
              <EventsPaginationBar
                tab="managing"
                page={page}
                pageSize={pageSize}
                total={managingTotal}
              />
            </>
          ) : (
            <>
              <div className="mb-4">
                <h2 className="text-base font-semibold tracking-tight">
                  Events where you&apos;re registered as an exhibitor
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vehicle registrations and attendance tied to your account. You
                  can still appear under{" "}
                  <strong className="font-medium text-foreground">
                    Managing
                  </strong>{" "}
                  if you also work the show.
                </p>
              </div>
              {participatingRows.length === 0 ? (
                <EmptyParticipating />
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border/80">
                  {participatingRows.map((row) => (
                    <ParticipatingCard key={row.registrationId} row={row} />
                  ))}
                </ul>
              )}
              <EventsPaginationBar
                tab="participating"
                page={page}
                pageSize={pageSize}
                total={participatingTotal}
              />
            </>
          )}
        </div>
      </div>

      <footer className="flex flex-col gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6 sm:px-5">
        <p className="text-xs text-muted-foreground">
          Looking for something else?
        </p>
        <div className="flex flex-wrap gap-2">
          {canCreate && (
            <Link
              href="/organizer/events/new"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Create event
            </Link>
          )}
          <Link
            href="/dashboard/registrations"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            All registrations
          </Link>
          <Link
            href="/events"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Browse events
          </Link>
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canCreateEvent } from "@/lib/permissions";
import { getRegisteredEventIdsForUser } from "@/lib/user-registered-events";
import {
  countUserManagingEvents,
  countUserOrganizerStaffEvents,
  loadManagingEventRowsPage,
} from "@/lib/dashboard-managing-events";
import { loadEventRegistrationSummaries } from "@/lib/event-registration-summary";
import {
  countParticipatingRegistrations,
  loadParticipatingEventRowsPage,
} from "@/lib/dashboard-participating-events";
import {
  getEventsPageSize,
  hrefDashboardEvents,
  parseEventsPage,
  parseEventsTab,
  parseShowPastEvents,
} from "@/lib/dashboard-events-url";
import {
  EventsOverview,
  type ManagingEventRow,
  type ParticipatingEventRow,
} from "@/components/dashboard/events/events-overview";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function DashboardEventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const showPastEvents = parseShowPastEvents(sp.past);
  const pageSize = getEventsPageSize();

  const [
    organizerEventCount,
    managingDistinctCount,
    participatingRecentCount,
    participatingTotalAll,
    registeredEventIds,
  ] = await Promise.all([
    countUserOrganizerStaffEvents(user.id),
    countUserManagingEvents(user.id),
    countParticipatingRegistrations(user.id, false),
    countParticipatingRegistrations(user.id, true),
    getRegisteredEventIdsForUser(user.id),
  ]);

  const showManagingTab = organizerEventCount > 0;

  const pickQuery = (key: string) => {
    const v = sp[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const showDeleted = pickQuery("deleted") === "1";
  const showArchived = pickQuery("archived") === "1";
  const showCreated = pickQuery("created") === "1";
  const showUpdated =
    pickQuery("updated") === "1" && pickQuery("created") !== "1";
  const staffFlash =
    showManagingTab &&
    sp.tab == null &&
    (showDeleted || showArchived || showCreated || showUpdated);

  let tab = staffFlash ? "managing" : parseEventsTab(sp.tab);
  if (tab === "managing" && !showManagingTab) {
    redirect(hrefDashboardEvents("participating", 1));
  }

  const participatingFilteredTotal = showPastEvents
    ? participatingTotalAll
    : participatingRecentCount;

  const participatingTabCount =
    showPastEvents && tab === "participating"
      ? participatingFilteredTotal
      : participatingRecentCount;

  const totalForTab =
    tab === "managing" ? managingDistinctCount : participatingFilteredTotal;
  const totalPages = Math.max(1, Math.ceil(totalForTab / pageSize));
  const page = Math.min(parseEventsPage(sp.page), totalPages);

  let managingRows: ManagingEventRow[] = [];
  let participatingRows: ParticipatingEventRow[] = [];

  if (tab === "managing") {
    const loaded = await loadManagingEventRowsPage(
      user.id,
      (page - 1) * pageSize,
      pageSize,
    );
    const organizerEventIds = loaded
      .filter((r) =>
        r.roles.some(
          (role) => role.slug === "organizer" || role.slug === "treasurer",
        ),
      )
      .map((r) => r.eventId);
    const summaries =
      organizerEventIds.length > 0
        ? await loadEventRegistrationSummaries(organizerEventIds)
        : {};
    managingRows = loaded.map((r) => ({
      ...r,
      organizerStats: r.roles.some(
        (role) => role.slug === "organizer" || role.slug === "treasurer",
      )
        ? (summaries[r.eventId] ?? null)
        : undefined,
    }));
  } else {
    participatingRows = await loadParticipatingEventRowsPage(
      user.id,
      showPastEvents,
      (page - 1) * pageSize,
      pageSize,
    );
  }

  let flash: "deleted" | "archived" | "created" | "updated" | null = null;
  if (showDeleted) flash = "deleted";
  else if (showArchived) flash = "archived";
  else if (showCreated) flash = "created";
  else if (showUpdated) flash = "updated";

  const dismissEventsHref = hrefDashboardEvents(
    tab,
    page,
    tab === "participating" ? { showPast: showPastEvents } : undefined,
  );

  return (
    <div className="page-shell max-w-4xl space-y-8">
      <div className="page-head flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Separate what you&apos;re{" "}
            <strong className="font-medium text-foreground">running</strong>{" "}
            from what you&apos;re{" "}
            <strong className="font-medium text-foreground">entering</strong>.
            The same event can appear in both when you wear multiple hats.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          {tab === "participating" ? (
            <Link
              href="/organizer/events/new"
              className={cn(
                buttonVariants({ size: "sm" }),
                "w-full justify-center sm:w-auto",
              )}
            >
              Create New Event
            </Link>
          ) : null}
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "w-full justify-center sm:w-auto",
            )}
          >
            Back to dashboard
          </Link>
        </div>
      </div>

      {flash ? (
        <div
          className={cn(
            "rounded-lg border px-4 py-4",
            flash === "deleted" &&
              "border-destructive/40 bg-destructive/10 text-destructive",
            flash === "archived" &&
              "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-50",
            (flash === "created" || flash === "updated") &&
              "border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-50",
          )}
          role="status"
        >
          <p className="text-base font-medium">
            {flash === "deleted"
              ? "Event deleted."
              : flash === "archived"
                ? "Event archived."
                : flash === "created"
                  ? "Your event has been successfully created."
                  : "Your event has been updated."}
          </p>
          {(flash === "created" || flash === "updated") && (
            <p className="mt-2 text-sm opacity-90">
              It appears under{" "}
              <span className="font-semibold">Managing</span> when you have a
              staff role on that event.
            </p>
          )}
          <Link
            href={dismissEventsHref}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mt-4",
              flash === "deleted" && "border-destructive/40",
              flash === "archived" &&
                "border-amber-600/40 dark:border-amber-400/40",
              (flash === "created" || flash === "updated") &&
                "border-emerald-600/40 dark:border-emerald-400/40",
            )}
          >
            Dismiss
          </Link>
        </div>
      ) : null}

      <EventsOverview
        tab={tab}
        page={page}
        pageSize={pageSize}
        managingTotal={managingDistinctCount}
        managingRows={managingRows}
        participatingTotal={participatingTabCount}
        participatingTotalAll={participatingTotalAll}
        participatingRows={participatingRows}
        showPastEvents={showPastEvents}
        registeredEventIds={registeredEventIds}
        canCreate={canCreateEvent(user)}
        showManagingTab={showManagingTab}
      />
    </div>
  );
}

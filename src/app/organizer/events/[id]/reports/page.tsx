import type { User } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { requireStaffStepUpPage } from "@/lib/require-organizer-step-up";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { EventOrganizerNavBar } from "@/components/organizer/event-organizer-nav-bar";
import { EventReportsNav } from "@/components/organizer/reports/event-reports-nav";
import { EventReportsHome } from "@/components/organizer/reports/event-reports-home";
import { EventReportShell } from "@/components/organizer/reports/event-report-shell";
import { ComingSoonReport } from "@/components/organizer/reports/coming-soon-report";
import { EventReportContent } from "@/components/organizer/reports/event-report-content";
import { ReportContentLoading } from "@/components/organizer/reports/report-content-loading";
import { ContactSiteAdminButton } from "@/components/organizer/contact-site-admin-button";
import { formatEventShowNumber } from "@/lib/event-show-number";
import {
  defaultEventReportType,
  getEventReportDefinition,
  isVotingResultsReportVisible,
  normalizeReportParam,
  type EventReportTypeId,
  type EventReportVotingSetup,
} from "@/lib/event-reports/report-types";
import { loadEventReportVotingSetup } from "@/lib/event-reports/voting-method-status";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    report?: string;
    q?: string;
    page?: string;
    showAll?: string;
  }>;
};

export default async function EventReportsPage({ params, searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id: eventId } = await params;
  const sp = await searchParams;

  await requireStaffStepUpPage({
    user,
    pathname: `/organizer/events/${eventId}/reports`,
    search: sp.report ? `?report=${encodeURIComponent(sp.report)}` : undefined,
  });

  const reportParam = sp.report?.trim();
  if (!reportParam) {
    redirect(
      `/organizer/events/${eventId}/reports?report=${defaultEventReportType()}`,
    );
  }

  const [event, votingSetup] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, showNumber: true, orgId: true },
    }),
    loadEventReportVotingSetup(eventId),
  ]);
  if (!event) notFound();

  const allowed = await canManageEvent(
    user.id,
    eventId,
    event.orgId,
    user.platformRole,
  );
  if (!allowed) notFound();

  const activeReport = normalizeReportParam(reportParam);
  const reportMeta = getEventReportDefinition(activeReport);

  if (!reportMeta) {
    redirect(
      `/organizer/events/${eventId}/reports?report=${defaultEventReportType()}`,
    );
  }

  if (reportMeta.comingSoon) {
    const eventLabel = `${formatEventShowNumber(event.showNumber)} ${event.name}`;
    return (
      <ReportsPageLayout
        eventId={eventId}
        event={event}
        eventLabel={eventLabel}
        user={user}
        activeReport={activeReport}
        votingSetup={votingSetup}
      >
        <EventReportShell eventId={eventId} report={reportMeta}>
          <ComingSoonReport report={reportMeta} />
        </EventReportShell>
      </ReportsPageLayout>
    );
  }

  if (!reportMeta.available && activeReport !== "home") {
    redirect(
      `/organizer/events/${eventId}/reports?report=${defaultEventReportType()}`,
    );
  }

  if (
    activeReport !== "home" &&
    !isVotingResultsReportVisible(activeReport, votingSetup)
  ) {
    redirect(
      `/organizer/events/${eventId}/reports?report=${defaultEventReportType()}`,
    );
  }

  const eventLabel = `${formatEventShowNumber(event.showNumber)} ${event.name}`;

  if (activeReport === "home") {
    return (
      <ReportsPageLayout
        eventId={eventId}
        event={event}
        eventLabel={eventLabel}
        user={user}
        activeReport={activeReport}
        votingSetup={votingSetup}
      >
        <EventReportShell eventId={eventId} report={reportMeta}>
          <EventReportsHome eventId={eventId} votingSetup={votingSetup} />
        </EventReportShell>
      </ReportsPageLayout>
    );
  }

  return (
    <ReportsPageLayout
      eventId={eventId}
      event={event}
      eventLabel={eventLabel}
      user={user}
      activeReport={activeReport}
      votingSetup={votingSetup}
    >
      <Suspense
        fallback={
          <ReportContentLoading eventId={eventId} report={reportMeta} />
        }
      >
        <EventReportContent
          eventId={eventId}
          report={reportMeta}
          searchParams={sp}
        />
      </Suspense>
    </ReportsPageLayout>
  );
}

function ReportsPageLayout({
  eventId,
  event,
  eventLabel,
  user,
  activeReport,
  votingSetup,
  children,
}: {
  eventId: string;
  event: { name: string; showNumber: number };
  eventLabel: string;
  user: Pick<User, "id" | "platformRole">;
  activeReport: EventReportTypeId;
  votingSetup: EventReportVotingSetup;
  children: ReactNode;
}) {
  return (
    <div className="page-shell max-w-6xl space-y-6">
      <div className="text-center sm:text-left">
        <Link
          href="/dashboard/events?tab=managing"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← My events
        </Link>
      </div>

      <div className="space-y-4">
        <EventOrganizerNavBar eventId={eventId} active="reports" user={user} />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Reports —{" "}
              <EventNameWithNumber
                name={event.name}
                showNumber={event.showNumber}
              />
            </h1>
          </div>
          <ContactSiteAdminButton eventId={eventId} eventLabel={eventLabel} />
        </div>
        <Suspense
          fallback={
            <div
              className="h-[4.5rem] animate-pulse rounded-lg border bg-muted/30"
              aria-hidden
            />
          }
        >
          <EventReportsNav
            eventId={eventId}
            activeReport={activeReport}
            votingSetup={votingSetup}
          />
        </Suspense>
      </div>

      {children}
    </div>
  );
}

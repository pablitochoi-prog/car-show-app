import type { User } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { requireStaffStepUpPage } from "@/lib/require-organizer-step-up";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { EventOrganizerNavBar } from "@/components/organizer/event-organizer-nav-bar";
import { EventReportsNav } from "@/components/organizer/reports/event-reports-nav";
import { EventReportsHome } from "@/components/organizer/reports/event-reports-home";
import { EventReportShell } from "@/components/organizer/reports/event-report-shell";
import { ComingSoonReport } from "@/components/organizer/reports/coming-soon-report";
import { FinancialSummaryReport } from "@/components/organizer/reports/financial-summary-report";
import { RegistrationDetailReport } from "@/components/organizer/reports/registration-detail-report";
import { StaffingListReport } from "@/components/organizer/reports/staffing-list-report";
import { PublicVotingResultsReport } from "@/components/organizer/reports/public-voting-results-report";
import { JudgeBallotResultsReport } from "@/components/organizer/reports/judge-ballot-results-report";
import { AwardsWinnersReportView } from "@/components/organizer/reports/awards-winners-report";
import { JudgeProgressReportView } from "@/components/organizer/reports/judge-progress-report";
import { ScorecardsSummaryReportView } from "@/components/organizer/reports/scorecards-summary-report";
import { ContactSiteAdminButton } from "@/components/organizer/contact-site-admin-button";
import { formatEventShowNumber } from "@/lib/event-show-number";
import {
  defaultEventReportType,
  getEventReportDefinition,
  normalizeReportParam,
  type EventReportTypeId,
} from "@/lib/event-reports/report-types";
import { loadFinancialSummaryReport } from "@/lib/event-reports/financial-summary";
import { loadRegistrationDetailReport } from "@/lib/event-reports/registration-detail";
import { loadStaffingListReport } from "@/lib/event-reports/staffing-list";
import { loadPublicVotingResultsReport } from "@/lib/event-reports/public-voting-results";
import { loadJudgeBallotResultsReport } from "@/lib/event-reports/judge-ballot-results";
import { loadAwardsWinnersReport } from "@/lib/event-reports/awards-winners";
import { loadJudgeProgressReport } from "@/lib/event-reports/judge-progress";
import { loadScorecardsSummaryReport } from "@/lib/event-reports/scorecards-summary";

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

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, showNumber: true, orgId: true },
  });
  if (!event) notFound();

  const allowed = await canManageEvent(
    user.id,
    eventId,
    event.orgId,
    user.platformRole,
  );
  if (!allowed) notFound();

  const reportParam = sp.report?.trim();
  if (!reportParam) {
    redirect(
      `/organizer/events/${eventId}/reports?report=${defaultEventReportType()}`,
    );
  }

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

  const eventLabel = `${formatEventShowNumber(event.showNumber)} ${event.name}`;

  if (activeReport === "home") {
    return (
      <ReportsPageLayout
        eventId={eventId}
        event={event}
        eventLabel={eventLabel}
        user={user}
        activeReport={activeReport}
      >
        <EventReportShell eventId={eventId} report={reportMeta}>
          <EventReportsHome eventId={eventId} />
        </EventReportShell>
      </ReportsPageLayout>
    );
  }

  let generatedAt: string | undefined;
  let body: ReactNode;

  switch (activeReport) {
    case "financial": {
      const data = await loadFinancialSummaryReport(eventId);
      generatedAt = data.generatedAt;
      body = <FinancialSummaryReport data={data} />;
      break;
    }
    case "registrations": {
      const page = parseInt(sp.page ?? "1", 10);
      const data = await loadRegistrationDetailReport(eventId, {
        search: sp.q,
        page: Number.isFinite(page) ? page : 1,
      });
      generatedAt = data.generatedAt;
      body = <RegistrationDetailReport eventId={eventId} data={data} />;
      break;
    }
    case "staffing": {
      const data = await loadStaffingListReport(eventId);
      generatedAt = data.generatedAt;
      body = <StaffingListReport data={data} />;
      break;
    }
    case "public-voting": {
      const data = await loadPublicVotingResultsReport(eventId, {
        showAll: sp.showAll === "1",
      });
      generatedAt = data.generatedAt;
      body = <PublicVotingResultsReport eventId={eventId} data={data} />;
      break;
    }
    case "judge-ballots": {
      const data = await loadJudgeBallotResultsReport(eventId, {
        showAll: sp.showAll === "1",
      });
      generatedAt = data.generatedAt;
      body = <JudgeBallotResultsReport eventId={eventId} data={data} />;
      break;
    }
    case "awards": {
      const data = await loadAwardsWinnersReport(eventId);
      if (!data) notFound();
      generatedAt = data.generatedAt;
      body = <AwardsWinnersReportView data={data} />;
      break;
    }
    case "judge-progress": {
      const data = await loadJudgeProgressReport(eventId);
      generatedAt = data.generatedAt;
      body = <JudgeProgressReportView data={data} />;
      break;
    }
    case "scorecards": {
      const data = await loadScorecardsSummaryReport(eventId);
      generatedAt = data.generatedAt;
      body = <ScorecardsSummaryReportView data={data} />;
      break;
    }
    default:
      redirect(
        `/organizer/events/${eventId}/reports?report=${defaultEventReportType()}`,
      );
  }

  return (
    <ReportsPageLayout
      eventId={eventId}
      event={event}
      eventLabel={eventLabel}
      user={user}
      activeReport={activeReport}
    >
      <EventReportShell
        eventId={eventId}
        report={reportMeta}
        generatedAt={generatedAt}
      >
        {body}
      </EventReportShell>
    </ReportsPageLayout>
  );
}

function ReportsPageLayout({
  eventId,
  event,
  eventLabel,
  user,
  activeReport,
  children,
}: {
  eventId: string;
  event: { name: string; showNumber: number };
  eventLabel: string;
  user: Pick<User, "id" | "platformRole">;
  activeReport: EventReportTypeId;
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
        <EventReportsNav eventId={eventId} activeReport={activeReport} />
      </div>

      {children}
    </div>
  );
}

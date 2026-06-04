import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { requireStaffStepUpPage } from "@/lib/require-organizer-step-up";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { EventOrganizerNavBar } from "@/components/organizer/event-organizer-nav-bar";
import { EventReportsNav } from "@/components/organizer/reports/event-reports-nav";
import { VotingTabulationReport } from "@/components/organizer/reports/voting-tabulation-report";
import { ContactSiteAdminButton } from "@/components/organizer/contact-site-admin-button";
import { formatEventShowNumber } from "@/lib/event-show-number";
import {
  defaultEventReportType,
  EVENT_REPORT_TYPES,
  isEventReportTypeId,
} from "@/lib/event-reports/report-types";
import { loadEventVotingTabulation } from "@/lib/event-reports/voting-tabulation";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ report?: string }>;
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

  const activeReport = isEventReportTypeId(reportParam)
    ? reportParam
    : defaultEventReportType();

  const reportMeta = EVENT_REPORT_TYPES.find((r) => r.id === activeReport);
  if (!reportMeta?.available) {
    redirect(
      `/organizer/events/${eventId}/reports?report=${defaultEventReportType()}`,
    );
  }

  const eventLabel = `${formatEventShowNumber(event.showNumber)} ${event.name}`;

  let reportContent: ReactNode;
  if (activeReport === "voting") {
    const tabulation = await loadEventVotingTabulation(eventId);
    reportContent = <VotingTabulationReport data={tabulation} />;
  } else {
    reportContent = (
      <p className="text-sm text-muted-foreground">This report is coming soon.</p>
    );
  }

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

      <main
        id="report-content"
        className="min-h-[16rem] rounded-lg border bg-card p-4 shadow-sm sm:p-6"
      >
        <div className="mb-4 border-b pb-3">
          <h2 className="text-lg font-semibold">{reportMeta.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {reportMeta.description}
          </p>
        </div>
        {reportContent}
      </main>
    </div>
  );
}

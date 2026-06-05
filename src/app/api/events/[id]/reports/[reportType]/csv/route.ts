import { NextResponse } from "next/server";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import {
  buildAwardsWinnersCsv,
  loadAwardsWinnersReport,
} from "@/lib/event-reports/awards-winners";
import {
  buildJudgeBallotResultsCsv,
  loadJudgeBallotResultsReport,
} from "@/lib/event-reports/judge-ballot-results";
import {
  buildJudgeProgressCsv,
  loadJudgeProgressReport,
} from "@/lib/event-reports/judge-progress";
import {
  buildPublicVotingResultsCsv,
  loadPublicVotingResultsReport,
} from "@/lib/event-reports/public-voting-results";
import {
  buildRegistrationDetailCsv,
  loadAllRegistrationDetailRows,
} from "@/lib/event-reports/registration-detail";
import {
  isCsvExportReportId,
  normalizeReportParam,
} from "@/lib/event-reports/report-types";
import {
  buildStaffingListCsv,
  loadStaffingListReport,
} from "@/lib/event-reports/staffing-list";

type RouteParams = { params: Promise<{ id: string; reportType: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, reportType: rawType } = await params;
  const reportType = normalizeReportParam(rawType);

  if (!isCsvExportReportId(reportType)) {
    return NextResponse.json({ error: "Invalid report type." }, { status: 400 });
  }

  const allowed = await canManageEvent(
    user.id,
    eventId,
    undefined,
    user.platformRole,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let csv = "";
  const filename = `event-${eventId.slice(0, 8)}-${reportType}.csv`;

  switch (reportType) {
    case "registrations": {
      const rows = await loadAllRegistrationDetailRows(eventId);
      csv = buildRegistrationDetailCsv(rows);
      break;
    }
    case "staffing": {
      const report = await loadStaffingListReport(eventId);
      csv = buildStaffingListCsv(report.rows);
      break;
    }
    case "public-voting": {
      const report = await loadPublicVotingResultsReport(eventId, {
        showAll: true,
      });
      csv = buildPublicVotingResultsCsv(report);
      break;
    }
    case "judge-ballots": {
      const report = await loadJudgeBallotResultsReport(eventId, {
        showAll: true,
      });
      csv = buildJudgeBallotResultsCsv(report);
      break;
    }
    case "awards": {
      const report = await loadAwardsWinnersReport(eventId);
      if (!report) {
        return NextResponse.json({ error: "Event not found." }, { status: 404 });
      }
      csv = buildAwardsWinnersCsv(report);
      break;
    }
    case "judge-progress": {
      const report = await loadJudgeProgressReport(eventId);
      csv = buildJudgeProgressCsv(report);
      break;
    }
    default:
      return NextResponse.json({ error: "Invalid report type." }, { status: 400 });
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

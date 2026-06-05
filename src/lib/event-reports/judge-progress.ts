import { prisma } from "@/lib/db";
import { getEventStaffList } from "@/lib/event-staff";
import { csvRow } from "@/lib/event-reports/csv";

export type JudgeProgressSummary = {
  totalJudges: number;
  totalScoreSheets: number;
  submittedScoreSheets: number;
  draftScoreSheets: number;
  notStartedScoreSheets: number;
  overallCompletionPercent: string;
};

export type JudgeProgressRow = {
  judgeName: string;
  judgeEmail: string;
  assignedClasses: string;
  scoreSheetsAssigned: number;
  scoreSheetsDraft: number;
  scoreSheetsSubmitted: number;
  scoreSheetsFinalized: number;
  completionPercent: string;
  lastSubmissionAt: string;
  ballotVotesUsed: number;
  ballotVotesRemaining: number;
  missingAssignments: string;
};

export type JudgeProgressReport = {
  generatedAt: string;
  summary: JudgeProgressSummary;
  rows: JudgeProgressRow[];
};

export async function loadJudgeProgressReport(
  eventId: string,
): Promise<JudgeProgressReport> {
  const [staff, sheets, allocations, classAssignments] = await Promise.all([
    getEventStaffList(eventId),
    prisma.judgeScoreSheet.findMany({
      where: { eventId },
      select: {
        judgeUserId: true,
        status: true,
        submittedAt: true,
        eventJudgingClass: { select: { name: true } },
      },
    }),
    prisma.judgeBallotAllocation.findMany({
      where: { eventId },
      select: {
        judgeUserId: true,
        votesUsed: true,
        totalVotesAllocated: true,
      },
    }),
    prisma.eventJudgeCategoryAssignment.findMany({
      where: { eventId },
      select: {
        judgeUserId: true,
        eventJudgingClass: { select: { name: true } },
      },
    }),
  ]);

  const judges = staff.filter((m) =>
    m.roles.some((r) => r.slug === "judge" || r.slug === "special_judge"),
  );

  const sheetsByJudge = new Map<string, typeof sheets>();
  for (const s of sheets) {
    const list = sheetsByJudge.get(s.judgeUserId) ?? [];
    list.push(s);
    sheetsByJudge.set(s.judgeUserId, list);
  }

  const classesByJudge = new Map<string, Set<string>>();
  for (const a of classAssignments) {
    if (!a.eventJudgingClass) continue;
    const set = classesByJudge.get(a.judgeUserId) ?? new Set();
    set.add(a.eventJudgingClass.name);
    classesByJudge.set(a.judgeUserId, set);
  }

  let totalAssigned = 0;
  let totalDraft = 0;
  let totalSubmitted = 0;
  let totalFinalized = 0;

  const rows: JudgeProgressRow[] = judges.map((j) => {
    const judgeSheets = sheetsByJudge.get(j.userId) ?? [];
    let draft = 0;
    let submitted = 0;
    let finalized = 0;
    let lastSub: Date | null = null;
    for (const s of judgeSheets) {
      if (s.status === "DRAFT") draft++;
      else if (s.status === "SUBMITTED") submitted++;
      else if (s.status === "FINALIZED") finalized++;
      if (s.submittedAt && (!lastSub || s.submittedAt > lastSub)) {
        lastSub = s.submittedAt;
      }
    }
    const assigned = judgeSheets.length;
    totalAssigned += assigned;
    totalDraft += draft;
    totalSubmitted += submitted;
    totalFinalized += finalized;

    const done = submitted + finalized;
    const pct =
      assigned > 0 ? `${Math.round((done / assigned) * 100)}%` : "—";

    const judgeAlloc = allocations.filter((a) => a.judgeUserId === j.userId);
    const votesUsed = judgeAlloc.reduce((sum, a) => sum + a.votesUsed, 0);
    const votesTotal = judgeAlloc.reduce(
      (sum, a) => sum + a.totalVotesAllocated,
      0,
    );

    return {
      judgeName: j.name,
      judgeEmail: j.email,
      assignedClasses: [...(classesByJudge.get(j.userId) ?? [])].join("; ") || "—",
      scoreSheetsAssigned: assigned,
      scoreSheetsDraft: draft,
      scoreSheetsSubmitted: submitted,
      scoreSheetsFinalized: finalized,
      completionPercent: pct,
      lastSubmissionAt: lastSub ? lastSub.toISOString() : "",
      ballotVotesUsed: votesUsed,
      ballotVotesRemaining: Math.max(0, votesTotal - votesUsed),
      missingAssignments:
        assigned === 0 && judgeAlloc.length === 0
          ? "No score sheets or ballot allocations"
          : "",
    };
  });

  const doneTotal = totalSubmitted + totalFinalized;
  const overallPct =
    totalAssigned > 0
      ? `${Math.round((doneTotal / totalAssigned) * 100)}%`
      : "0%";

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalJudges: judges.length,
      totalScoreSheets: totalAssigned,
      submittedScoreSheets: totalSubmitted,
      draftScoreSheets: totalDraft,
      notStartedScoreSheets: Math.max(
        0,
        totalAssigned - totalDraft - totalSubmitted - totalFinalized,
      ),
      overallCompletionPercent: overallPct,
    },
    rows,
  };
}

export function buildJudgeProgressCsv(report: JudgeProgressReport): string {
  const header = [
    "judge_name",
    "judge_email",
    "assigned_classes",
    "score_sheets_assigned",
    "draft",
    "submitted",
    "finalized",
    "completion_percent",
    "last_submission_at",
    "ballot_votes_used",
    "ballot_votes_remaining",
    "missing_assignments",
  ];
  return [
    header.join(","),
    ...report.rows.map((r) =>
      csvRow([
        r.judgeName,
        r.judgeEmail,
        r.assignedClasses,
        r.scoreSheetsAssigned,
        r.scoreSheetsDraft,
        r.scoreSheetsSubmitted,
        r.scoreSheetsFinalized,
        r.completionPercent,
        r.lastSubmissionAt,
        r.ballotVotesUsed,
        r.ballotVotesRemaining,
        r.missingAssignments,
      ]),
    ),
  ].join("\n");
}

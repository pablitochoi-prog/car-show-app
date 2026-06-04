import { prisma } from "@/lib/db";
import { getEventStaffList } from "@/lib/event-staff";
import { csvRow } from "@/lib/event-reports/csv";

export type StaffingListRow = {
  name: string;
  email: string;
  phone: string;
  roles: string;
  judgingClasses: string;
  ballotCategories: string;
  inviteStatus: string;
  lastActivity: string;
};

export type StaffingListReport = {
  generatedAt: string;
  rows: StaffingListRow[];
};

export async function loadStaffingListReport(
  eventId: string,
): Promise<StaffingListReport> {
  const [staff, judgingAssignments, ballotCategories] = await Promise.all([
    getEventStaffList(eventId),
    prisma.eventJudgeCategoryAssignment.findMany({
      where: { eventId },
      select: {
        judgeUserId: true,
        eventJudgingClass: { select: { name: true } },
      },
    }),
    prisma.judgeBallotCategory.findMany({
      where: { eventId },
      select: {
        name: true,
        judgeAssignments: { select: { judgeUserId: true } },
        specialJudgeAssignments: { select: { judgeUserId: true } },
      },
    }),
  ]);

  const classesByJudge = new Map<string, Set<string>>();
  for (const a of judgingAssignments) {
    if (!a.eventJudgingClass) continue;
    const set = classesByJudge.get(a.judgeUserId) ?? new Set();
    set.add(a.eventJudgingClass.name);
    classesByJudge.set(a.judgeUserId, set);
  }

  const ballotByJudge = new Map<string, Set<string>>();
  for (const cat of ballotCategories) {
    const judgeIds = [
      ...cat.judgeAssignments.map((j) => j.judgeUserId),
      ...cat.specialJudgeAssignments.map((j) => j.judgeUserId),
    ];
    for (const uid of judgeIds) {
      const set = ballotByJudge.get(uid) ?? new Set();
      set.add(cat.name);
      ballotByJudge.set(uid, set);
    }
  }

  const rows: StaffingListRow[] = staff.map((m) => ({
    name: m.name,
    email: m.email,
    phone: m.phoneDisplay || "—",
    roles: m.roles.map((r) => r.name).join(", "),
    judgingClasses: [...(classesByJudge.get(m.userId) ?? [])].sort().join("; ") || "—",
    ballotCategories: [...(ballotByJudge.get(m.userId) ?? [])].sort().join("; ") || "—",
    inviteStatus: "Active staff member",
    lastActivity: "Not tracked per event",
  }));

  return {
    generatedAt: new Date().toISOString(),
    rows,
  };
}

export function buildStaffingListCsv(rows: StaffingListRow[]): string {
  const header = [
    "name",
    "email",
    "phone",
    "roles",
    "judging_classes",
    "ballot_categories",
    "invite_status",
    "last_activity",
  ];
  return [
    header.join(","),
    ...rows.map((r) =>
      csvRow([
        r.name,
        r.email,
        r.phone,
        r.roles,
        r.judgingClasses,
        r.ballotCategories,
        r.inviteStatus,
        r.lastActivity,
      ]),
    ),
  ].join("\n");
}

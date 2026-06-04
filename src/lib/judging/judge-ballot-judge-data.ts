import type { JudgeBallotCategoryStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getUserEventRoles } from "@/lib/event-staff";
import { findVehicleEntryByCode } from "@/lib/vehicle-entry-lookup";
import {
  canEditBallotVotes,
  sumSubmittedVoteCounts,
} from "@/lib/judging/judge-ballot-validation";
import {
  userCanViewBallotCategory,
  userCanVoteInBallotCategory,
  userHasBallotStaffRole,
  type BallotCategoryAuthShape,
} from "@/lib/judging/judge-ballot-authorization";
import { loadJudgeAssignedScoreSummary } from "@/lib/judging/judge-assigned-scorecard-data";

export class JudgeBallotAccessError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/** Judge may view ballot categories that are not DRAFT. */
export function isJudgeVisibleBallotStatus(
  status: JudgeBallotCategoryStatus,
): boolean {
  return status !== "DRAFT";
}

export async function assertJudgeCanAccessBallotCategory(
  judgeUserId: string,
  categoryId: string,
): Promise<{ eventId: string; status: JudgeBallotCategoryStatus }> {
  const category = await prisma.judgeBallotCategory.findUnique({
    where: { id: categoryId },
    include: {
      judgeAssignments: { select: { judgeUserId: true } },
      specialJudgeAssignments: { select: { judgeUserId: true } },
    },
  });
  if (!category || !category.isActive) {
    throw new JudgeBallotAccessError("NOT_FOUND", "Award category not found.");
  }

  const roles = await getUserEventRoles(judgeUserId, category.eventId);
  if (!userHasBallotStaffRole(roles)) {
    throw new JudgeBallotAccessError(
      "NOT_JUDGE",
      "You do not have ballot access for this event.",
    );
  }

  const auth: BallotCategoryAuthShape = {
    requiresSpecialJudge: category.requiresSpecialJudge,
    assignedJudgeUserIds: category.judgeAssignments.map((a) => a.judgeUserId),
    specialJudgeUserIds: category.specialJudgeAssignments.map(
      (a) => a.judgeUserId,
    ),
  };
  if (!userCanViewBallotCategory(roles, judgeUserId, auth)) {
    throw new JudgeBallotAccessError(
      "NOT_ASSIGNED",
      "You are not assigned to this award category.",
    );
  }

  if (!isJudgeVisibleBallotStatus(category.status)) {
    throw new JudgeBallotAccessError(
      "NOT_AVAILABLE",
      "This award category is not yet open for judges.",
    );
  }

  return { eventId: category.eventId, status: category.status };
}

export async function assertJudgeForEvent(
  judgeUserId: string,
  eventId: string,
): Promise<void> {
  await assertJudgeBallotEventAccess(judgeUserId, eventId);
}

export async function assertJudgeBallotEventAccess(
  judgeUserId: string,
  eventId: string,
): Promise<void> {
  const roles = await getUserEventRoles(judgeUserId, eventId);
  if (!userHasBallotStaffRole(roles)) {
    throw new JudgeBallotAccessError(
      "NOT_JUDGE",
      "You do not have ballot access for this event.",
    );
  }
}

function categoryPassesJudgeFilter(
  roles: Awaited<ReturnType<typeof getUserEventRoles>>,
  category: BallotCategoryAuthShape,
  judgeUserId: string,
): boolean {
  return userCanViewBallotCategory(roles, judgeUserId, category);
}

export type JudgeAssignmentEventRow = {
  eventId: string;
  eventName: string;
  showNumber: number | null;
  startDate: string;
  openBallotCategoryCount: number;
  scoreSheetAssignmentCount: number;
  scoreSheetPendingCount: number;
};

export async function loadJudgeBallotAssignments(
  judgeUserId: string,
): Promise<JudgeAssignmentEventRow[]> {
  const staffLinks = await prisma.eventStaffMember.findMany({
    where: { userId: judgeUserId },
    select: {
      eventId: true,
      roleLinks: { include: { role: { select: { slug: true } } } },
      event: {
        select: {
          id: true,
          name: true,
          showNumber: true,
          startDate: true,
        },
      },
    },
  });

  const ballotStaff = staffLinks.filter((s) =>
    s.roleLinks.some(
      (l) => l.role.slug === "judge" || l.role.slug === "special_judge",
    ),
  );

  const rows: JudgeAssignmentEventRow[] = [];

  for (const link of ballotStaff) {
    const roles = await getUserEventRoles(judgeUserId, link.eventId);
    const categories = await prisma.judgeBallotCategory.findMany({
      where: {
        eventId: link.eventId,
        isActive: true,
        status: { not: "DRAFT" },
      },
      include: {
        judgeAssignments: { select: { judgeUserId: true } },
        specialJudgeAssignments: { select: { judgeUserId: true } },
      },
    });

    const accessible = categories.filter((c) =>
      categoryPassesJudgeFilter(
        roles,
        {
          requiresSpecialJudge: c.requiresSpecialJudge,
          assignedJudgeUserIds: c.judgeAssignments.map((a) => a.judgeUserId),
          specialJudgeUserIds: c.specialJudgeAssignments.map(
            (a) => a.judgeUserId,
          ),
        },
        judgeUserId,
      ),
    );

    const scoreSheetSummary = await loadJudgeAssignedScoreSummary(
      judgeUserId,
      link.eventId,
    );
    if (
      accessible.length === 0 &&
      scoreSheetSummary.assignmentCount === 0
    ) {
      continue;
    }

    rows.push({
      eventId: link.event.id,
      eventName: link.event.name,
      showNumber: link.event.showNumber,
      startDate: link.event.startDate.toISOString(),
      openBallotCategoryCount: accessible.filter((c) => c.status === "OPEN")
        .length,
      scoreSheetAssignmentCount: scoreSheetSummary.assignmentCount,
      scoreSheetPendingCount: scoreSheetSummary.pendingCount,
    });
  }

  rows.sort(
    (a, b) =>
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  );

  return rows;
}

export type JudgeBallotCategoryListItem = {
  id: string;
  name: string;
  status: JudgeBallotCategoryStatus;
  votesPerJudge: number;
  maxVotesPerJudgePerVehicle: number;
  votesUsed: number;
  votesRemaining: number;
  eligibleClassesSummary: string;
  canEdit: boolean;
};

async function eligibleClassesSummary(
  eventId: string,
  eligibleClasses: { eventCategoryId: string }[],
): Promise<string> {
  if (eligibleClasses.length === 0) return "All vehicle classes";

  const ids = eligibleClasses.map((c) => c.eventCategoryId);
  const rows = await prisma.eventCategory.findMany({
    where: { eventId, id: { in: ids } },
    select: {
      customName: true,
      category: { select: { name: true } },
    },
  });

  const labels = rows.map(
    (r) => r.customName?.trim() || r.category?.name || "Class",
  );
  return labels.length > 0 ? labels.join(", ") : `${ids.length} class(es)`;
}

export async function loadJudgeBallotCategoriesForEvent(
  judgeUserId: string,
  eventId: string,
): Promise<JudgeBallotCategoryListItem[]> {
  await assertJudgeBallotEventAccess(judgeUserId, eventId);
  const roles = await getUserEventRoles(judgeUserId, eventId);

  const categories = await prisma.judgeBallotCategory.findMany({
    where: {
      eventId,
      isActive: true,
      status: { not: "DRAFT" },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      eligibleClasses: { select: { eventCategoryId: true } },
      judgeAssignments: { select: { judgeUserId: true } },
      specialJudgeAssignments: { select: { judgeUserId: true } },
      allocations: {
        where: { judgeUserId },
        select: { votesUsed: true, totalVotesAllocated: true },
      },
      votes: {
        where: { judgeUserId },
        select: { voteCount: true, status: true },
      },
    },
  });

  const out: JudgeBallotCategoryListItem[] = [];

  for (const cat of categories) {
    const auth: BallotCategoryAuthShape = {
      requiresSpecialJudge: cat.requiresSpecialJudge,
      assignedJudgeUserIds: cat.judgeAssignments.map((a) => a.judgeUserId),
      specialJudgeUserIds: cat.specialJudgeAssignments.map(
        (a) => a.judgeUserId,
      ),
    };
    if (!categoryPassesJudgeFilter(roles, auth, judgeUserId)) {
      continue;
    }

    const allocation = cat.allocations[0];
    const votesUsed =
      allocation?.votesUsed ??
      sumSubmittedVoteCounts(
        cat.votes.map((v) => ({
          vehicleEntryCode: "",
          voteCount: v.voteCount,
          status: v.status,
        })),
      );
    const total = allocation?.totalVotesAllocated ?? cat.votesPerJudge;

    out.push({
      id: cat.id,
      name: cat.name,
      status: cat.status,
      votesPerJudge: cat.votesPerJudge,
      maxVotesPerJudgePerVehicle: cat.maxVotesPerJudgePerVehicle,
      votesUsed,
      votesRemaining: Math.max(0, total - votesUsed),
      eligibleClassesSummary: await eligibleClassesSummary(
        eventId,
        cat.eligibleClasses,
      ),
      canEdit: canEditBallotVotes(cat.status),
    });
  }

  return out;
}

export type JudgeBallotVoteDisplay = {
  vehicleEntryCode: string;
  voteCount: number;
  nickname: string | null;
  year: number;
  make: string;
  model: string;
  classLabel: string;
  eventCategoryId: string | null;
};

export type JudgeBallotCategoryDetail = {
  category: {
    id: string;
    name: string;
    status: JudgeBallotCategoryStatus;
    votesPerJudge: number;
    maxVotesPerJudgePerVehicle: number;
    judgeGuidance: string | null;
    eligibleClassesSummary: string;
    eligibleEventCategoryIds: string[];
  };
  allocation: {
    totalVotesAllocated: number;
    votesUsed: number;
    votesRemaining: number;
  };
  votes: JudgeBallotVoteDisplay[];
  canEdit: boolean;
};

export async function loadJudgeBallotCategoryDetail(
  judgeUserId: string,
  eventId: string,
  categoryId: string,
): Promise<JudgeBallotCategoryDetail> {
  const access = await assertJudgeCanAccessBallotCategory(
    judgeUserId,
    categoryId,
  );
  if (access.eventId !== eventId) {
    throw new JudgeBallotAccessError("NOT_FOUND", "Award category not found.");
  }

  const category = await prisma.judgeBallotCategory.findUnique({
    where: { id: categoryId },
    include: {
      eligibleClasses: { select: { eventCategoryId: true } },
      allocations: {
        where: { judgeUserId },
        select: { totalVotesAllocated: true, votesUsed: true },
      },
      votes: {
        where: { judgeUserId, status: "SUBMITTED", voteCount: { gt: 0 } },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!category) {
    throw new JudgeBallotAccessError("NOT_FOUND", "Award category not found.");
  }

  const allocationRow = category.allocations[0];
  const votesUsed = allocationRow?.votesUsed ?? 0;
  const totalAllocated =
    allocationRow?.totalVotesAllocated ?? category.votesPerJudge;

  const votes: JudgeBallotVoteDisplay[] = [];
  for (const v of category.votes) {
    const entry = await findVehicleEntryByCode(v.vehicleEntryCode);
    votes.push({
      vehicleEntryCode: v.vehicleEntryCode,
      voteCount: v.voteCount,
      nickname: entry?.nickname ?? null,
      year: entry?.year ?? 0,
      make: entry?.make ?? "—",
      model: entry?.model ?? "—",
      classLabel: entry?.classLabel ?? "—",
      eventCategoryId: entry?.eventCategoryId ?? null,
    });
  }

  const eligibleIds = category.eligibleClasses.map((c) => c.eventCategoryId);

  return {
    category: {
      id: category.id,
      name: category.name,
      status: category.status,
      votesPerJudge: category.votesPerJudge,
      maxVotesPerJudgePerVehicle: category.maxVotesPerJudgePerVehicle,
      judgeGuidance: category.judgeGuidance,
      eligibleClassesSummary: await eligibleClassesSummary(
        eventId,
        category.eligibleClasses,
      ),
      eligibleEventCategoryIds: eligibleIds,
    },
    allocation: {
      totalVotesAllocated: totalAllocated,
      votesUsed,
      votesRemaining: Math.max(0, totalAllocated - votesUsed),
    },
    votes,
    canEdit: canEditBallotVotes(category.status),
  };
}

export type JudgeVehicleEntryPreview = {
  vehicleEntryCode: string;
  nickname: string | null;
  year: number;
  make: string;
  model: string;
  classLabel: string;
  eventCategoryId: string | null;
  eligible: boolean;
};

export async function previewJudgeVehicleEntry(
  judgeUserId: string,
  eventId: string,
  vehicleEntryCode: string,
  categoryId?: string,
): Promise<JudgeVehicleEntryPreview> {
  await assertJudgeBallotEventAccess(judgeUserId, eventId);

  const entry = await findVehicleEntryByCode(vehicleEntryCode);
  if (!entry || entry.eventId !== eventId) {
    throw new JudgeBallotAccessError(
      "VEHICLE_NOT_FOUND",
      "Vehicle ID not found for this event.",
    );
  }

  let eligible = true;
  if (categoryId) {
    const cat = await prisma.judgeBallotCategory.findFirst({
      where: { id: categoryId, eventId },
      include: { eligibleClasses: { select: { eventCategoryId: true } } },
    });
    if (cat) {
      const ids = cat.eligibleClasses.map((c) => c.eventCategoryId);
      if (ids.length > 0) {
        eligible =
          entry.eventCategoryId != null && ids.includes(entry.eventCategoryId);
      }
    }
  }

  return {
    vehicleEntryCode: entry.vehicleEntryCode,
    nickname: entry.nickname,
    year: entry.year,
    make: entry.make,
    model: entry.model,
    classLabel: entry.classLabel,
    eventCategoryId: entry.eventCategoryId,
    eligible,
  };
}

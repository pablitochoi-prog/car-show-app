import type { JudgeBallotAllocationStatus, JudgeBallotCategoryStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getUserEventRoles } from "@/lib/event-staff";
import { sumSubmittedVoteCounts } from "@/lib/judging/judge-ballot-validation";
import {
  userCanVoteInBallotCategory,
  type BallotCategoryAuthShape,
} from "@/lib/judging/judge-ballot-authorization";

/** List user IDs with JUDGE role on an event. */
export async function listEventJudgeUserIds(eventId: string): Promise<string[]> {
  const staff = await prisma.eventStaffMember.findMany({
    where: { eventId },
    select: {
      userId: true,
      roleLinks: { include: { role: { select: { slug: true } } } },
    },
  });

  const judgeIds: string[] = [];
  for (const member of staff) {
    const hasJudge = member.roleLinks.some((l) => l.role.slug === "judge");
    if (hasJudge) judgeIds.push(member.userId);
  }
  return judgeIds;
}

/** List user IDs with Special Judge role on an event. */
export async function listEventSpecialJudgeUserIds(
  eventId: string,
): Promise<string[]> {
  const staff = await prisma.eventStaffMember.findMany({
    where: { eventId },
    select: {
      userId: true,
      roleLinks: { include: { role: { select: { slug: true } } } },
    },
  });

  const ids: string[] = [];
  for (const member of staff) {
    const has = member.roleLinks.some((l) => l.role.slug === "special_judge");
    if (has) ids.push(member.userId);
  }
  return ids;
}

function allocationStatusForCategory(
  categoryStatus: JudgeBallotCategoryStatus,
): JudgeBallotAllocationStatus {
  if (categoryStatus === "OPEN") return "ACTIVE";
  return "LOCKED";
}

function categoryAuthShape(category: {
  requiresSpecialJudge: boolean;
  judgeAssignments: { judgeUserId: string }[];
  specialJudgeAssignments: { judgeUserId: string }[];
}): BallotCategoryAuthShape {
  return {
    requiresSpecialJudge: category.requiresSpecialJudge,
    assignedJudgeUserIds: category.judgeAssignments.map((a) => a.judgeUserId),
    specialJudgeUserIds: category.specialJudgeAssignments.map(
      (a) => a.judgeUserId,
    ),
  };
}

/** Create or refresh vote allocations when a ballot category opens. */
export async function syncJudgeBallotAllocationsForCategory(
  categoryId: string,
): Promise<{ allocationCount: number }> {
  const category = await prisma.judgeBallotCategory.findUnique({
    where: { id: categoryId },
    include: {
      judgeAssignments: { select: { judgeUserId: true } },
      specialJudgeAssignments: { select: { judgeUserId: true } },
    },
  });
  if (!category) {
    throw new Error("Award category not found.");
  }
  if (category.status !== "OPEN") {
    throw new Error("Allocations are synced only when the category is OPEN.");
  }

  const auth = categoryAuthShape(category);
  let eligibleJudgeIds: string[] = [];

  if (category.requiresSpecialJudge) {
    const specialStaffIds = await listEventSpecialJudgeUserIds(category.eventId);
    eligibleJudgeIds = auth.specialJudgeUserIds.filter((id) =>
      specialStaffIds.includes(id),
    );
  } else {
    const eventJudgeIds = await listEventJudgeUserIds(category.eventId);
    const assignedIds = auth.assignedJudgeUserIds;
    eligibleJudgeIds =
      assignedIds.length > 0
        ? assignedIds.filter((id) => eventJudgeIds.includes(id))
        : eventJudgeIds;
  }

  const allocStatus = allocationStatusForCategory(category.status);

  for (const judgeUserId of eligibleJudgeIds) {
    await prisma.judgeBallotAllocation.upsert({
      where: {
        categoryId_judgeUserId: { categoryId, judgeUserId },
      },
      create: {
        eventId: category.eventId,
        categoryId,
        judgeUserId,
        totalVotesAllocated: category.votesPerJudge,
        votesUsed: 0,
        status: allocStatus,
      },
      update: {
        totalVotesAllocated: category.votesPerJudge,
        status: allocStatus,
      },
    });
  }

  return { allocationCount: eligibleJudgeIds.length };
}

/** Recompute votesUsed on a judge allocation from submitted vote rows. */
export async function recomputeJudgeBallotAllocationUsage(
  categoryId: string,
  judgeUserId: string,
): Promise<number> {
  const votes = await prisma.judgeBallotVote.findMany({
    where: { categoryId, judgeUserId },
    select: { voteCount: true, status: true },
  });
  const votesUsed = sumSubmittedVoteCounts(
    votes.map((v) => ({
      vehicleEntryCode: "",
      voteCount: v.voteCount,
      status: v.status,
    })),
  );

  await prisma.judgeBallotAllocation.updateMany({
    where: { categoryId, judgeUserId },
    data: { votesUsed },
  });

  return votesUsed;
}

/** Open a ballot category: set status OPEN and create allocations. */
export async function openJudgeBallotCategory(categoryId: string) {
  const category = await prisma.judgeBallotCategory.update({
    where: { id: categoryId },
    data: { status: "OPEN" },
  });
  const { allocationCount } = await syncJudgeBallotAllocationsForCategory(category.id);
  return { category, allocationCount };
}

/** Close or finalize a ballot category and lock allocations. */
export async function closeJudgeBallotCategory(
  categoryId: string,
  status: "CLOSED" | "FINALIZED",
) {
  const category = await prisma.judgeBallotCategory.update({
    where: { id: categoryId },
    data: { status },
  });
  await prisma.judgeBallotAllocation.updateMany({
    where: { categoryId },
    data: { status: "LOCKED" },
  });
  return category;
}

/** Verify judge may vote in a category (server-side authorization). */
export async function assertJudgeCanVoteInCategory(
  judgeUserId: string,
  categoryId: string,
): Promise<{ eventId: string }> {
  const category = await prisma.judgeBallotCategory.findUnique({
    where: { id: categoryId },
    include: {
      judgeAssignments: { select: { judgeUserId: true } },
      specialJudgeAssignments: { select: { judgeUserId: true } },
    },
  });
  if (!category) {
    throw new Error("Award category not found.");
  }

  const roles = await getUserEventRoles(judgeUserId, category.eventId);
  const auth = categoryAuthShape(category);

  if (!userCanVoteInBallotCategory(roles, judgeUserId, auth)) {
    if (category.requiresSpecialJudge) {
      throw new Error("You are not assigned to vote in this Special Judge award category.");
    }
    throw new Error("You are not assigned to vote in this award category.");
  }

  return { eventId: category.eventId };
}

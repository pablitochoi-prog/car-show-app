import type { JudgeBallotAllocationStatus, JudgeBallotCategoryStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getUserEventRoles } from "@/lib/event-staff";
import { sumVoteCounts } from "@/lib/judging/judge-ballot-validation";

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

function allocationStatusForCategory(
  categoryStatus: JudgeBallotCategoryStatus,
): JudgeBallotAllocationStatus {
  if (categoryStatus === "OPEN") return "ACTIVE";
  return "LOCKED";
}

/** Create or refresh vote allocations when a ballot category opens. */
export async function syncJudgeBallotAllocationsForCategory(
  categoryId: string,
): Promise<{ allocationCount: number }> {
  const category = await prisma.judgeBallotCategory.findUnique({
    where: { id: categoryId },
    include: { judgeAssignments: { select: { judgeUserId: true } } },
  });
  if (!category) {
    throw new Error("Award category not found.");
  }
  if (category.status !== "OPEN") {
    throw new Error("Allocations are synced only when the category is OPEN.");
  }

  const eventJudgeIds = await listEventJudgeUserIds(category.eventId);
  const assignedIds = category.judgeAssignments.map((a) => a.judgeUserId);
  const eligibleJudgeIds =
    assignedIds.length > 0
      ? assignedIds.filter((id) => eventJudgeIds.includes(id))
      : eventJudgeIds;

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

/** Recompute votesUsed on a judge allocation from vote rows. */
export async function recomputeJudgeBallotAllocationUsage(
  categoryId: string,
  judgeUserId: string,
): Promise<number> {
  const votes = await prisma.judgeBallotVote.findMany({
    where: { categoryId, judgeUserId },
    select: { voteCount: true },
  });
  const votesUsed = sumVoteCounts(
    votes.map((v) => ({ vehicleEntryCode: "", voteCount: v.voteCount })),
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

/** Verify judge has JUDGE role and optional category assignment. */
export async function assertJudgeCanVoteInCategory(
  judgeUserId: string,
  categoryId: string,
): Promise<{ eventId: string }> {
  const category = await prisma.judgeBallotCategory.findUnique({
    where: { id: categoryId },
    include: { judgeAssignments: { select: { judgeUserId: true } } },
  });
  if (!category) {
    throw new Error("Award category not found.");
  }

  const roles = await getUserEventRoles(judgeUserId, category.eventId);
  if (!roles.includes("JUDGE")) {
    throw new Error("You must be assigned as a judge for this event.");
  }

  const assignedIds = category.judgeAssignments.map((a) => a.judgeUserId);
  if (assignedIds.length > 0 && !assignedIds.includes(judgeUserId)) {
    throw new Error("You are not assigned to vote in this award category.");
  }

  return { eventId: category.eventId };
}

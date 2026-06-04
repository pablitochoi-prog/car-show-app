import { prisma } from "@/lib/db";
import { DEFAULT_BALLOT_VOTES_PER_JUDGE } from "@/lib/judging/judge-ballot-authorization";

export type EventAwardBallotConfig = {
  eventAwardId: string;
  ballotCategoryId: string | null;
  requiresSpecialJudge: boolean;
  assignedSpecialJudgeUserIds: string[];
};

function awardDisplayName(row: {
  customName: string | null;
  specialAward: { name: string } | null;
}): string {
  return row.specialAward?.name ?? row.customName?.trim() ?? "Custom Award";
}

/** Ensure a draft ballot category exists for this event special award. */
export async function ensureBallotCategoryForEventAward(
  eventAwardId: string,
): Promise<{ id: string; eventId: string; name: string }> {
  const existing = await prisma.judgeBallotCategory.findUnique({
    where: { eventAwardId },
    select: { id: true, eventId: true, name: true },
  });
  if (existing) return existing;

  const award = await prisma.eventAward.findUnique({
    where: { id: eventAwardId },
    include: { specialAward: { select: { name: true } } },
  });
  if (!award) {
    throw new Error("Event award not found.");
  }

  const maxSort = await prisma.judgeBallotCategory.aggregate({
    where: { eventId: award.eventId },
    _max: { sortOrder: true },
  });

  const created = await prisma.judgeBallotCategory.create({
    data: {
      eventId: award.eventId,
      eventAwardId,
      name: awardDisplayName(award),
      votesPerJudge: DEFAULT_BALLOT_VOTES_PER_JUDGE,
      maxVotesPerJudgePerVehicle: 1,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      status: "DRAFT",
    },
    select: { id: true, eventId: true, name: true },
  });

  return created;
}

export async function loadEventAwardBallotConfigs(
  eventId: string,
): Promise<EventAwardBallotConfig[]> {
  const awards = await prisma.eventAward.findMany({
    where: { eventId },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  const categories = await prisma.judgeBallotCategory.findMany({
    where: { eventId, eventAwardId: { not: null } },
    include: {
      specialJudgeAssignments: { select: { judgeUserId: true } },
    },
  });

  const byAwardId = new Map(
    categories
      .filter((c) => c.eventAwardId)
      .map((c) => [c.eventAwardId!, c]),
  );

  return awards.map((a) => {
    const cat = byAwardId.get(a.id);
    return {
      eventAwardId: a.id,
      ballotCategoryId: cat?.id ?? null,
      requiresSpecialJudge: cat?.requiresSpecialJudge ?? false,
      assignedSpecialJudgeUserIds:
        cat?.specialJudgeAssignments.map((s) => s.judgeUserId) ?? [],
    };
  });
}

export async function updateEventAwardBallotSpecialJudge(
  eventId: string,
  eventAwardId: string,
  input: {
    requiresSpecialJudge: boolean;
    assignedSpecialJudgeUserIds: string[];
  },
): Promise<EventAwardBallotConfig> {
  const award = await prisma.eventAward.findFirst({
    where: { id: eventAwardId, eventId },
  });
  if (!award) {
    throw new Error("Event award not found.");
  }

  const category = await ensureBallotCategoryForEventAward(eventAwardId);

  if (category.eventId !== eventId) {
    throw new Error("Event award does not belong to this event.");
  }

  const cat = await prisma.$transaction(async (tx) => {
    if (!input.requiresSpecialJudge) {
      await tx.judgeBallotSpecialJudge.deleteMany({
        where: { categoryId: category.id },
      });
      await tx.judgeBallotCategoryJudge.deleteMany({
        where: { categoryId: category.id },
      });
    } else {
      await tx.judgeBallotCategoryJudge.deleteMany({
        where: { categoryId: category.id },
      });
      await tx.judgeBallotSpecialJudge.deleteMany({
        where: { categoryId: category.id },
      });
      const ids = [...new Set(input.assignedSpecialJudgeUserIds.filter(Boolean))];
      if (ids.length > 0) {
        await tx.judgeBallotSpecialJudge.createMany({
          data: ids.map((judgeUserId) => ({
            categoryId: category.id,
            judgeUserId,
          })),
        });
      }
    }

    return tx.judgeBallotCategory.update({
      where: { id: category.id },
      data: { requiresSpecialJudge: input.requiresSpecialJudge },
      include: {
        specialJudgeAssignments: { select: { judgeUserId: true } },
      },
    });
  });

  return {
    eventAwardId,
    ballotCategoryId: cat.id,
    requiresSpecialJudge: cat.requiresSpecialJudge,
    assignedSpecialJudgeUserIds: cat.specialJudgeAssignments.map(
      (s) => s.judgeUserId,
    ),
  };
}

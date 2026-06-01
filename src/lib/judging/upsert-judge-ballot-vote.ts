import { prisma } from "@/lib/db";
import {
  validateJudgeBallotVoteUpsert,
  type JudgeBallotVoteRow,
} from "@/lib/judging/judge-ballot-validation";
import {
  assertJudgeCanVoteInCategory,
  recomputeJudgeBallotAllocationUsage,
} from "@/lib/judging/judge-ballot-allocation";

export type UpsertJudgeBallotVoteInput = {
  categoryId: string;
  judgeUserId: string;
  vehicleEntryCode: string;
  registrationId: string;
  registrationVehicleId: string | null;
  vehicleEventCategoryId: string | null;
  voteCount: number;
  notes?: string | null;
};

export async function upsertJudgeBallotVote(input: UpsertJudgeBallotVoteInput) {
  const { eventId } = await assertJudgeCanVoteInCategory(
    input.judgeUserId,
    input.categoryId,
  );

  const category = await prisma.judgeBallotCategory.findUnique({
    where: { id: input.categoryId },
    include: {
      eligibleClasses: { select: { eventCategoryId: true } },
    },
  });
  if (!category || category.eventId !== eventId) {
    throw new Error("Award category not found.");
  }

  const existingRows = await prisma.judgeBallotVote.findMany({
    where: { categoryId: input.categoryId, judgeUserId: input.judgeUserId },
    select: { vehicleEntryCode: true, voteCount: true },
  });

  const validation = validateJudgeBallotVoteUpsert({
    category: {
      status: category.status,
      votesPerJudge: category.votesPerJudge,
      maxVotesPerJudgePerVehicle: category.maxVotesPerJudgePerVehicle,
      eligibleEventCategoryIds: category.eligibleClasses.map(
        (c) => c.eventCategoryId,
      ),
    },
    vehicleEntryCode: input.vehicleEntryCode,
    vehicleEventCategoryId: input.vehicleEventCategoryId,
    proposedVoteCount: input.voteCount,
    existingVotes: existingRows as JudgeBallotVoteRow[],
  });

  if (!validation.ok) {
    const err = new Error(validation.message);
    (err as Error & { code: string }).code = validation.code;
    throw err;
  }

  if (input.voteCount === 0) {
    await prisma.judgeBallotVote.deleteMany({
      where: {
        categoryId: input.categoryId,
        judgeUserId: input.judgeUserId,
        vehicleEntryCode: input.vehicleEntryCode,
      },
    });
  } else {
    await prisma.judgeBallotVote.upsert({
      where: {
        categoryId_judgeUserId_vehicleEntryCode: {
          categoryId: input.categoryId,
          judgeUserId: input.judgeUserId,
          vehicleEntryCode: input.vehicleEntryCode,
        },
      },
      create: {
        eventId,
        categoryId: input.categoryId,
        judgeUserId: input.judgeUserId,
        registrationId: input.registrationId,
        registrationVehicleId: input.registrationVehicleId,
        vehicleEntryCode: input.vehicleEntryCode,
        voteCount: input.voteCount,
        notes: input.notes?.trim() || null,
      },
      update: {
        voteCount: input.voteCount,
        notes: input.notes?.trim() || null,
      },
    });
  }

  const votesUsed = await recomputeJudgeBallotAllocationUsage(
    input.categoryId,
    input.judgeUserId,
  );

  return {
    votesUsed,
    votesRemaining: category.votesPerJudge - votesUsed,
  };
}

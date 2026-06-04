import type { ScoreSheetJudgingPeriodStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ScoreSheetJudgingPeriodSnapshot = {
  status: ScoreSheetJudgingPeriodStatus;
  closedAt: string | null;
  finalizedAt: string | null;
  finalizedByUserId: string | null;
  draftSheetCount: number;
  submittedSheetCount: number;
  finalizedSheetCount: number;
};

export function isScoreSheetJudgingOpen(
  status: ScoreSheetJudgingPeriodStatus,
): boolean {
  return status === "OPEN";
}

export async function loadScoreSheetJudgingPeriod(
  eventId: string,
): Promise<ScoreSheetJudgingPeriodSnapshot | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      scoreSheetJudgingPeriodStatus: true,
      scoreSheetJudgingClosedAt: true,
      scoreSheetJudgingFinalizedAt: true,
      scoreSheetJudgingFinalizedByUserId: true,
    },
  });
  if (!event) return null;

  const counts = await prisma.judgeScoreSheet.groupBy({
    by: ["status"],
    where: { eventId },
    _count: { _all: true },
  });

  let draftSheetCount = 0;
  let submittedSheetCount = 0;
  let finalizedSheetCount = 0;
  for (const row of counts) {
    if (row.status === "DRAFT") draftSheetCount = row._count._all;
    else if (row.status === "SUBMITTED") submittedSheetCount = row._count._all;
    else if (row.status === "FINALIZED") finalizedSheetCount = row._count._all;
  }

  return {
    status: event.scoreSheetJudgingPeriodStatus,
    closedAt: event.scoreSheetJudgingClosedAt?.toISOString() ?? null,
    finalizedAt: event.scoreSheetJudgingFinalizedAt?.toISOString() ?? null,
    finalizedByUserId: event.scoreSheetJudgingFinalizedByUserId,
    draftSheetCount,
    submittedSheetCount,
    finalizedSheetCount,
  };
}

export async function assertScoreSheetJudgingOpenForJudges(eventId: string): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { scoreSheetJudgingPeriodStatus: true },
  });
  if (!event) {
    throw new ScoreSheetJudgingPeriodError("NOT_FOUND", "Event not found.");
  }
  if (!isScoreSheetJudgingOpen(event.scoreSheetJudgingPeriodStatus)) {
    throw new ScoreSheetJudgingPeriodError(
      "JUDGING_CLOSED",
      "The judging period has ended. Scorecards can no longer be edited or submitted.",
    );
  }
}

export class ScoreSheetJudgingPeriodError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "INVALID_STATE" | "JUDGING_CLOSED",
    message: string,
  ) {
    super(message);
    this.name = "ScoreSheetJudgingPeriodError";
  }
}

/** Stop judging — judges can no longer save or submit; results remain based on submitted sheets. */
export async function closeScoreSheetJudgingPeriod(
  eventId: string,
  actorUserId: string,
): Promise<ScoreSheetJudgingPeriodSnapshot> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { scoreSheetJudgingPeriodStatus: true },
  });
  if (!event) {
    throw new ScoreSheetJudgingPeriodError("NOT_FOUND", "Event not found.");
  }
  if (event.scoreSheetJudgingPeriodStatus === "FINALIZED") {
    throw new ScoreSheetJudgingPeriodError(
      "INVALID_STATE",
      "Results are already finalized. Reopen is not supported.",
    );
  }
  if (event.scoreSheetJudgingPeriodStatus === "CLOSED") {
    return (await loadScoreSheetJudgingPeriod(eventId))!;
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      scoreSheetJudgingPeriodStatus: "CLOSED",
      scoreSheetJudgingClosedAt: new Date(),
    },
  });

  return (await loadScoreSheetJudgingPeriod(eventId))!;
}

/** Re-open judging after a close — judges can save and submit scorecards again. */
export async function reopenScoreSheetJudgingPeriod(
  eventId: string,
): Promise<ScoreSheetJudgingPeriodSnapshot> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { scoreSheetJudgingPeriodStatus: true },
  });
  if (!event) {
    throw new ScoreSheetJudgingPeriodError("NOT_FOUND", "Event not found.");
  }
  if (event.scoreSheetJudgingPeriodStatus === "FINALIZED") {
    throw new ScoreSheetJudgingPeriodError(
      "INVALID_STATE",
      "Results are finalized. Judging cannot be reopened.",
    );
  }
  if (event.scoreSheetJudgingPeriodStatus === "OPEN") {
    return (await loadScoreSheetJudgingPeriod(eventId))!;
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      scoreSheetJudgingPeriodStatus: "OPEN",
      scoreSheetJudgingClosedAt: null,
    },
  });

  return (await loadScoreSheetJudgingPeriod(eventId))!;
}

/**
 * Finalize official results — ends judging and promotes submitted scorecards to FINALIZED.
 * Incomplete (draft) scorecards are excluded from rankings (unchanged behavior).
 */
export async function finalizeScoreSheetJudgingPeriod(
  eventId: string,
  actorUserId: string,
): Promise<ScoreSheetJudgingPeriodSnapshot> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { scoreSheetJudgingPeriodStatus: true },
  });
  if (!event) {
    throw new ScoreSheetJudgingPeriodError("NOT_FOUND", "Event not found.");
  }
  if (event.scoreSheetJudgingPeriodStatus === "FINALIZED") {
    return (await loadScoreSheetJudgingPeriod(eventId))!;
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: eventId },
      data: {
        scoreSheetJudgingPeriodStatus: "FINALIZED",
        scoreSheetJudgingClosedAt: event.scoreSheetJudgingPeriodStatus === "OPEN" ? now : undefined,
        scoreSheetJudgingFinalizedAt: now,
        scoreSheetJudgingFinalizedByUserId: actorUserId,
      },
    });

    await tx.judgeScoreSheet.updateMany({
      where: { eventId, status: "SUBMITTED" },
      data: {
        status: "FINALIZED",
        finalizedAt: now,
      },
    });
  });

  return (await loadScoreSheetJudgingPeriod(eventId))!;
}

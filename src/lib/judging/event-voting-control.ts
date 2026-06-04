import type { EventAwardsVotingStatus, ScoreSheetJudgingPeriodStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSmsVotingWindowStatus } from "@/lib/sms/voting-window";
import { closeJudgeBallotCategory, openJudgeBallotCategory } from "@/lib/judging/judge-ballot-allocation";
import {
  closeScoreSheetJudgingPeriod,
  finalizeScoreSheetJudgingPeriod,
  reopenScoreSheetJudgingPeriod,
  ScoreSheetJudgingPeriodError,
} from "@/lib/judging/score-sheet-judging-period";

export type EventVotingOverallStatus = EventAwardsVotingStatus;

export type EventVotingControlSnapshot = {
  overall: EventVotingOverallStatus;
  publicVoting: {
    configured: boolean;
    status: "open" | "closed" | "not_started" | "not_configured";
  };
  ballot: {
    configured: boolean;
    openCount: number;
    closedCount: number;
    finalizedCount: number;
    draftCount: number;
  };
  scoreSheet: {
    configured: boolean;
    status: ScoreSheetJudgingPeriodStatus;
  };
  canCloseAll: boolean;
  /** Open public voting, ballot categories (draft/closed), and score sheet judging at once. */
  canOpenAll: boolean;
  canReopenAll: boolean;
  canFinalizeAll: boolean;
  /** Site admin only — revert FINALIZED → CLOSED so organizers can reopen voting. */
  canUnfinalizeAll: boolean;
  trophyWinnersEnabled: boolean;
};

export function isEventVotingReadyForTrophies(
  snapshot: EventVotingControlSnapshot,
): boolean {
  return snapshot.trophyWinnersEnabled;
}

export class EventVotingControlError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "INVALID_STATE" = "INVALID_STATE",
  ) {
    super(message);
    this.name = "EventVotingControlError";
  }
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export async function loadEventVotingControl(
  eventId: string,
): Promise<EventVotingControlSnapshot | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      eventAwardsVotingStatus: true,
      smsVotingEnabled: true,
      smsVotingStartsAt: true,
      smsVotingEndsAt: true,
      status: true,
      scoreSheetJudgingPeriodStatus: true,
      _count: {
        select: {
          votingCategories: true,
          judgeBallotCategories: true,
          eventJudgingTemplates: true,
        },
      },
    },
  });
  if (!event) return null;

  const ballotCounts = await prisma.judgeBallotCategory.groupBy({
    by: ["status"],
    where: { eventId },
    _count: { _all: true },
  });

  let ballotOpen = 0;
  let ballotClosed = 0;
  let ballotFinalized = 0;
  let ballotDraft = 0;
  for (const row of ballotCounts) {
    if (row.status === "OPEN") ballotOpen = row._count._all;
    else if (row.status === "CLOSED") ballotClosed = row._count._all;
    else if (row.status === "FINALIZED") ballotFinalized = row._count._all;
    else if (row.status === "DRAFT") ballotDraft = row._count._all;
  }

  const publicConfigured =
    event.smsVotingEnabled && event._count.votingCategories > 0;
  const publicWindow = publicConfigured
    ? getSmsVotingWindowStatus({
        smsVotingEnabled: event.smsVotingEnabled,
        smsVotingStartsAt: event.smsVotingStartsAt,
        smsVotingEndsAt: event.smsVotingEndsAt,
        status: event.status,
      })
    : "closed";
  const publicClosed =
    !publicConfigured || publicWindow === "closed" || publicWindow === "ended";

  const ballotConfigured = event._count.judgeBallotCategories > 0;
  const scoreConfigured = event._count.eventJudgingTemplates > 0;
  const overall = event.eventAwardsVotingStatus;

  const configured =
    publicConfigured || ballotConfigured || scoreConfigured;

  const publicNeedsOpen =
    publicConfigured &&
    (publicWindow === "not_started" || publicClosed);
  const ballotNeedsOpen =
    ballotConfigured && (ballotDraft > 0 || ballotClosed > 0);
  const scoreNeedsOpen =
    scoreConfigured && event.scoreSheetJudgingPeriodStatus === "CLOSED";

  return {
    overall: configured ? overall : "OPEN",
    publicVoting: {
      configured: publicConfigured,
      status: publicConfigured
        ? publicWindow === "not_started"
          ? "not_started"
          : publicClosed
            ? "closed"
            : "open"
        : "not_configured",
    },
    ballot: {
      configured: ballotConfigured,
      openCount: ballotOpen,
      closedCount: ballotClosed,
      finalizedCount: ballotFinalized,
      draftCount: ballotDraft,
    },
    scoreSheet: {
      configured: scoreConfigured,
      status: event.scoreSheetJudgingPeriodStatus,
    },
    canCloseAll: configured && overall === "OPEN",
    canOpenAll:
      configured &&
      overall === "OPEN" &&
      (publicNeedsOpen || ballotNeedsOpen || scoreNeedsOpen),
    canReopenAll: configured && overall === "CLOSED",
    canFinalizeAll: configured && overall === "CLOSED",
    canUnfinalizeAll: configured && overall === "FINALIZED",
    trophyWinnersEnabled: overall === "FINALIZED",
  };
}

/** End public SMS/QR voting immediately (event + per-category windows). */
async function closePublicVoting(eventId: string): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { smsVotingEnabled: true, smsVotingStartsAt: true },
  });
  if (!event?.smsVotingEnabled) return;

  const endedAt = new Date(Date.now() - 60_000);
  const eventUpdate: {
    smsVotingEndsAt: Date;
    smsVotingStartsAt?: Date;
  } = { smsVotingEndsAt: endedAt };

  if (event.smsVotingStartsAt && event.smsVotingStartsAt > endedAt) {
    eventUpdate.smsVotingStartsAt = endedAt;
  }

  await prisma.$transaction([
    prisma.event.update({
      where: { id: eventId },
      data: eventUpdate,
    }),
    prisma.votingCategory.updateMany({
      where: { eventId, isActive: true },
      data: { votingEndsAt: endedAt },
    }),
  ]);
}

/** Reopen public voting — SMS end date one calendar day from today. */
async function reopenPublicVoting(eventId: string): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { smsVotingEnabled: true, smsVotingStartsAt: true },
  });
  if (!event?.smsVotingEnabled) return;

  const now = new Date();
  const endsAt = addDays(now, 1);
  const startsAt =
    event.smsVotingStartsAt && event.smsVotingStartsAt > now
      ? event.smsVotingStartsAt
      : now;

  await prisma.$transaction([
    prisma.event.update({
      where: { id: eventId },
      data: {
        smsVotingEndsAt: endsAt,
        smsVotingStartsAt: startsAt,
      },
    }),
    prisma.votingCategory.updateMany({
      where: { eventId, isActive: true },
      data: {
        votingEndsAt: endsAt,
        votingStartsAt: startsAt,
      },
    }),
  ]);
}

export async function closeAllEventVoting(
  eventId: string,
  actorUserId: string,
): Promise<EventVotingControlSnapshot> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new EventVotingControlError("Event not found.", "NOT_FOUND");
  }
  if (event.eventAwardsVotingStatus === "FINALIZED") {
    throw new EventVotingControlError(
      "Results are already finalized.",
      "INVALID_STATE",
    );
  }

  await closePublicVoting(eventId);

  const openBallot = await prisma.judgeBallotCategory.findMany({
    where: { eventId, status: "OPEN" },
    select: { id: true },
  });
  for (const cat of openBallot) {
    await closeJudgeBallotCategory(cat.id, "CLOSED");
  }

  if (event.scoreSheetJudgingPeriodStatus === "OPEN") {
    try {
      await closeScoreSheetJudgingPeriod(eventId, actorUserId);
    } catch (err) {
      if (
        !(err instanceof ScoreSheetJudgingPeriodError) ||
        err.code !== "INVALID_STATE"
      ) {
        throw err;
      }
    }
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { eventAwardsVotingStatus: "CLOSED" },
  });

  const snapshot = await loadEventVotingControl(eventId);
  if (!snapshot) {
    throw new EventVotingControlError("Event not found.", "NOT_FOUND");
  }
  return snapshot;
}

/** Open all configured voting channels while event status is OPEN. */
export async function openAllEventVoting(
  eventId: string,
): Promise<EventVotingControlSnapshot> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      eventAwardsVotingStatus: true,
      scoreSheetJudgingPeriodStatus: true,
      smsVotingEnabled: true,
    },
  });
  if (!event) {
    throw new EventVotingControlError("Event not found.", "NOT_FOUND");
  }
  if (event.eventAwardsVotingStatus === "FINALIZED") {
    throw new EventVotingControlError(
      "Results are finalized. Trophy winners are locked.",
      "INVALID_STATE",
    );
  }
  if (event.eventAwardsVotingStatus === "CLOSED") {
    throw new EventVotingControlError(
      "Voting is closed for this event. Use Reopen voting for event.",
      "INVALID_STATE",
    );
  }

  if (event.smsVotingEnabled) {
    const snapshot = await loadEventVotingControl(eventId);
    if (
      snapshot?.publicVoting.configured &&
      (snapshot.publicVoting.status === "not_started" ||
        snapshot.publicVoting.status === "closed")
    ) {
      await reopenPublicVoting(eventId);
    }
  }

  const ballotToOpen = await prisma.judgeBallotCategory.findMany({
    where: { eventId, status: { in: ["DRAFT", "CLOSED"] } },
    select: { id: true },
  });
  for (const cat of ballotToOpen) {
    await openJudgeBallotCategory(cat.id);
  }

  if (event.scoreSheetJudgingPeriodStatus === "CLOSED") {
    await reopenScoreSheetJudgingPeriod(eventId);
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { eventAwardsVotingStatus: "OPEN" },
  });

  const snapshot = await loadEventVotingControl(eventId);
  if (!snapshot) {
    throw new EventVotingControlError("Event not found.", "NOT_FOUND");
  }
  if (!snapshot.canOpenAll && snapshot.overall === "OPEN") {
    return snapshot;
  }
  return snapshot;
}

export async function reopenAllEventVoting(
  eventId: string,
): Promise<EventVotingControlSnapshot> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      eventAwardsVotingStatus: true,
      scoreSheetJudgingPeriodStatus: true,
      smsVotingEnabled: true,
    },
  });
  if (!event) {
    throw new EventVotingControlError("Event not found.", "NOT_FOUND");
  }
  if (event.eventAwardsVotingStatus !== "CLOSED") {
    throw new EventVotingControlError(
      event.eventAwardsVotingStatus === "FINALIZED"
        ? "Results are finalized. Trophy winners are locked."
        : "Voting is already open.",
      "INVALID_STATE",
    );
  }

  if (event.smsVotingEnabled) {
    await reopenPublicVoting(eventId);
  }

  const closedBallot = await prisma.judgeBallotCategory.findMany({
    where: { eventId, status: "CLOSED" },
    select: { id: true },
  });
  for (const cat of closedBallot) {
    await openJudgeBallotCategory(cat.id);
  }

  if (event.scoreSheetJudgingPeriodStatus === "CLOSED") {
    await reopenScoreSheetJudgingPeriod(eventId);
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { eventAwardsVotingStatus: "OPEN" },
  });

  const snapshot = await loadEventVotingControl(eventId);
  if (!snapshot) {
    throw new EventVotingControlError("Event not found.", "NOT_FOUND");
  }
  return snapshot;
}

export async function finalizeAllEventVoting(
  eventId: string,
  actorUserId: string,
): Promise<EventVotingControlSnapshot> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      eventAwardsVotingStatus: true,
      scoreSheetJudgingPeriodStatus: true,
      smsVotingEnabled: true,
    },
  });
  if (!event) {
    throw new EventVotingControlError("Event not found.", "NOT_FOUND");
  }
  if (event.eventAwardsVotingStatus === "FINALIZED") {
    const snapshot = await loadEventVotingControl(eventId);
    return snapshot!;
  }
  if (event.eventAwardsVotingStatus === "OPEN") {
    throw new EventVotingControlError(
      "Close all voting for the event before finalizing results.",
      "INVALID_STATE",
    );
  }

  await closePublicVoting(eventId);

  const toFinalize = await prisma.judgeBallotCategory.findMany({
    where: { eventId, status: { in: ["OPEN", "CLOSED"] } },
    select: { id: true },
  });
  for (const cat of toFinalize) {
    await closeJudgeBallotCategory(cat.id, "FINALIZED");
  }

  if (event.scoreSheetJudgingPeriodStatus !== "FINALIZED") {
    if (event.scoreSheetJudgingPeriodStatus === "OPEN") {
      await closeScoreSheetJudgingPeriod(eventId, actorUserId);
    }
    await finalizeScoreSheetJudgingPeriod(eventId, actorUserId);
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      eventAwardsVotingStatus: "FINALIZED",
      eventAwardsVotingFinalizedAt: new Date(),
    },
  });

  const snapshot = await loadEventVotingControl(eventId);
  if (!snapshot) {
    throw new EventVotingControlError("Event not found.", "NOT_FOUND");
  }
  return snapshot;
}

/**
 * Site admin only — undo event-level finalization. Restores CLOSED state so the
 * organizer sees Reopen voting / Finalize results again. Does not reopen voting.
 */
export async function unfinalizeAllEventVoting(
  eventId: string,
): Promise<EventVotingControlSnapshot> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { eventAwardsVotingStatus: true, scoreSheetJudgingPeriodStatus: true },
  });
  if (!event) {
    throw new EventVotingControlError("Event not found.", "NOT_FOUND");
  }
  if (event.eventAwardsVotingStatus !== "FINALIZED") {
    throw new EventVotingControlError(
      "Only finalized events can be un-finalized.",
      "INVALID_STATE",
    );
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.judgeBallotCategory.updateMany({
      where: { eventId, status: "FINALIZED" },
      data: { status: "CLOSED" },
    });

    if (event.scoreSheetJudgingPeriodStatus === "FINALIZED") {
      await tx.judgeScoreSheet.updateMany({
        where: { eventId, status: "FINALIZED" },
        data: { status: "SUBMITTED" },
      });
    }

    await tx.event.update({
      where: { id: eventId },
      data: {
        eventAwardsVotingStatus: "CLOSED",
        eventAwardsVotingFinalizedAt: null,
        scoreSheetJudgingPeriodStatus:
          event.scoreSheetJudgingPeriodStatus === "FINALIZED"
            ? "CLOSED"
            : event.scoreSheetJudgingPeriodStatus,
        scoreSheetJudgingClosedAt: now,
        scoreSheetJudgingFinalizedAt: null,
        scoreSheetJudgingFinalizedByUserId: null,
      },
    });
  });

  const snapshot = await loadEventVotingControl(eventId);
  if (!snapshot) {
    throw new EventVotingControlError("Event not found.", "NOT_FOUND");
  }
  return snapshot;
}

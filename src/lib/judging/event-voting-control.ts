import { prisma } from "@/lib/db";
import { getSmsVotingWindowStatus } from "@/lib/sms/voting-window";
import { closeJudgeBallotCategory, openJudgeBallotCategory } from "@/lib/judging/judge-ballot-allocation";
import {
  closeScoreSheetJudgingPeriod,
  finalizeScoreSheetJudgingPeriod,
  reopenScoreSheetJudgingPeriod,
  ScoreSheetJudgingPeriodError,
} from "@/lib/judging/score-sheet-judging-period";
import { resolvePublicVotingOpenWindow } from "@/lib/judging/public-voting-open-window";

export type {
  EventVotingControlSnapshot,
  EventVotingMethodKey,
  EventVotingOverallStatus,
  VotingMethodControlAction,
} from "@/lib/judging/event-voting-control-types";

export { isEventVotingReadyForTrophies } from "@/lib/judging/event-voting-control-types";

import type {
  EventVotingControlSnapshot,
  EventVotingMethodKey,
  VotingMethodControlAction,
} from "@/lib/judging/event-voting-control-types";

export class EventVotingControlError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "INVALID_STATE" = "INVALID_STATE",
  ) {
    super(message);
    this.name = "EventVotingControlError";
  }
}

type MethodVotingStatus = "not_started" | "open" | "closed";

function methodVotingStatus(
  method: EventVotingMethodKey,
  snapshot: EventVotingControlSnapshot,
): MethodVotingStatus {
  switch (method) {
    case "public-voting": {
      const { publicVoting } = snapshot;
      if (!publicVoting.configured || publicVoting.status === "not_configured") {
        return "not_started";
      }
      if (publicVoting.status === "not_started") return "not_started";
      if (publicVoting.status === "open") return "open";
      return "closed";
    }
    case "judge-ballot": {
      const { ballot } = snapshot;
      if (!ballot.configured) return "not_started";
      if (ballot.openCount > 0) return "open";
      if (
        ballot.draftCount > 0 &&
        ballot.closedCount === 0 &&
        ballot.finalizedCount === 0
      ) {
        return "not_started";
      }
      return "closed";
    }
    case "score-sheets": {
      const { scoreSheet } = snapshot;
      if (!scoreSheet.configured) return "not_started";
      if (scoreSheet.status === "OPEN") return "open";
      return "closed";
    }
  }
}

function isMethodConfigured(
  method: EventVotingMethodKey,
  snapshot: EventVotingControlSnapshot,
): boolean {
  switch (method) {
    case "public-voting":
      return snapshot.publicVoting.configured;
    case "judge-ballot":
      return snapshot.ballot.configured;
    case "score-sheets":
      return snapshot.scoreSheet.configured;
  }
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

/** Open or reopen public SMS/QR voting with organizer-adjusted window dates. */
async function openPublicVoting(eventId: string): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      smsVotingEnabled: true,
      smsVotingStartsAt: true,
      smsVotingEndsAt: true,
    },
  });
  if (!event?.smsVotingEnabled) return;

  const now = new Date();
  const { startsAt, endsAt } = resolvePublicVotingOpenWindow(
    now,
    event.smsVotingStartsAt,
    event.smsVotingEndsAt,
  );

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

async function openBallotVoting(
  eventId: string,
  includeDraft: boolean,
): Promise<void> {
  const statuses = includeDraft ? (["DRAFT", "CLOSED"] as const) : (["CLOSED"] as const);
  const toOpen = await prisma.judgeBallotCategory.findMany({
    where: { eventId, status: { in: [...statuses] } },
    select: { id: true },
  });
  for (const cat of toOpen) {
    await openJudgeBallotCategory(cat.id);
  }
}

async function closeBallotVoting(eventId: string): Promise<void> {
  const toClose = await prisma.judgeBallotCategory.findMany({
    where: { eventId, status: "OPEN" },
    select: { id: true },
  });
  for (const cat of toClose) {
    await closeJudgeBallotCategory(cat.id, "CLOSED");
  }
}

export async function runVotingMethodControlAction(
  eventId: string,
  method: EventVotingMethodKey,
  action: VotingMethodControlAction,
  actorUserId: string,
): Promise<EventVotingControlSnapshot> {
  const snapshot = await loadEventVotingControl(eventId);
  if (!snapshot) {
    throw new EventVotingControlError("Event not found.", "NOT_FOUND");
  }
  if (snapshot.overall === "FINALIZED") {
    throw new EventVotingControlError(
      "Results are finalized. Voting cannot be changed.",
      "INVALID_STATE",
    );
  }
  if (!isMethodConfigured(method, snapshot)) {
    throw new EventVotingControlError(
      "This voting method is not configured for the event.",
      "INVALID_STATE",
    );
  }

  const status = methodVotingStatus(method, snapshot);
  if (action === "open" && status !== "not_started") {
    throw new EventVotingControlError(
      "Voting is already open or closed. Use Close or Reopen voting.",
      "INVALID_STATE",
    );
  }
  if (action === "close" && status !== "open") {
    throw new EventVotingControlError(
      "Voting is not open for this method.",
      "INVALID_STATE",
    );
  }
  if (action === "reopen" && status !== "closed") {
    throw new EventVotingControlError(
      "Voting is not closed for this method.",
      "INVALID_STATE",
    );
  }

  switch (method) {
    case "public-voting":
      if (action === "close") {
        await closePublicVoting(eventId);
      } else {
        await openPublicVoting(eventId);
      }
      break;
    case "judge-ballot":
      if (action === "close") {
        await closeBallotVoting(eventId);
      } else if (action === "open") {
        await openBallotVoting(eventId, true);
      } else {
        await openBallotVoting(eventId, false);
      }
      break;
    case "score-sheets":
      if (action === "close") {
        await closeScoreSheetJudgingPeriod(eventId, actorUserId);
      } else {
        await reopenScoreSheetJudgingPeriod(eventId);
      }
      break;
  }

  const updated = await loadEventVotingControl(eventId);
  if (!updated) {
    throw new EventVotingControlError("Event not found.", "NOT_FOUND");
  }
  return updated;
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
      await openPublicVoting(eventId);
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
    await openPublicVoting(eventId);
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

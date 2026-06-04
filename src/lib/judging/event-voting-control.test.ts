import { describe, expect, it } from "vitest";
import { isEventVotingReadyForTrophies } from "@/lib/judging/event-voting-control";
import type { EventVotingControlSnapshot } from "@/lib/judging/event-voting-control";

function snapshot(
  overall: EventVotingControlSnapshot["overall"],
): EventVotingControlSnapshot {
  return {
    overall,
    publicVoting: { configured: true, status: "closed" },
    ballot: {
      configured: false,
      openCount: 0,
      closedCount: 0,
      finalizedCount: 0,
      draftCount: 0,
    },
    scoreSheet: { configured: true, status: "CLOSED" },
    canCloseAll: overall === "OPEN",
    canOpenAll: false,
    canReopenAll: overall === "CLOSED",
    canFinalizeAll: overall === "CLOSED",
    canUnfinalizeAll: overall === "FINALIZED",
    trophyWinnersEnabled: overall === "FINALIZED",
  };
}

describe("event-voting-control snapshot flags", () => {
  it("enables trophy winners only when finalized", () => {
    expect(isEventVotingReadyForTrophies(snapshot("FINALIZED"))).toBe(true);
    expect(isEventVotingReadyForTrophies(snapshot("CLOSED"))).toBe(false);
    expect(isEventVotingReadyForTrophies(snapshot("OPEN"))).toBe(false);
  });

  it("exposes unfinalize only when finalized", () => {
    expect(snapshot("FINALIZED").canUnfinalizeAll).toBe(true);
    expect(snapshot("CLOSED").canUnfinalizeAll).toBe(false);
    expect(snapshot("CLOSED").canReopenAll).toBe(true);
  });

  it("can open all when event is open but channels are not", () => {
    const open: EventVotingControlSnapshot = {
      ...snapshot("OPEN"),
      ballot: {
        configured: true,
        openCount: 0,
        closedCount: 1,
        finalizedCount: 0,
        draftCount: 2,
      },
      canOpenAll: true,
    };
    expect(open.canOpenAll).toBe(true);
    expect(snapshot("OPEN").canOpenAll).toBe(false);
  });
});

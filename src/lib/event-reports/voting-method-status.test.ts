import { describe, expect, it } from "vitest";
import {
  ballotVotingReportStatus,
  configureVotingStatusLabel,
  isVotingMethodEnabledForEvent,
  publicVotingReportStatus,
  reportVotingStatusLabel,
  scoreSheetReportStatus,
} from "./voting-method-status";
import type { EventVotingControlSnapshot } from "@/lib/judging/event-voting-control-types";

describe("reportVotingStatusLabel", () => {
  it("maps status codes to organizer-facing labels", () => {
    expect(reportVotingStatusLabel("not_started")).toBe("Not Started");
    expect(reportVotingStatusLabel("open")).toBe("Open for voting");
    expect(reportVotingStatusLabel("closed")).toBe("Closed for voting");
  });
});

describe("configureVotingStatusLabel", () => {
  it("maps status codes to configure page labels", () => {
    expect(configureVotingStatusLabel("not_started")).toBe("Voting Not Started");
    expect(configureVotingStatusLabel("open")).toBe("Voting Open");
    expect(configureVotingStatusLabel("closed")).toBe("Voting Closed");
  });
});

describe("publicVotingReportStatus", () => {
  it("returns not_started when public voting is not configured", () => {
    expect(
      publicVotingReportStatus({ configured: false, status: "not_configured" }),
    ).toBe("not_started");
  });

  it("returns open when the voting window is active", () => {
    expect(publicVotingReportStatus({ configured: true, status: "open" })).toBe(
      "open",
    );
  });
});

describe("ballotVotingReportStatus", () => {
  it("returns not_started when ballot categories are not configured", () => {
    expect(
      ballotVotingReportStatus({
        configured: false,
        openCount: 0,
        closedCount: 0,
        finalizedCount: 0,
        draftCount: 0,
      }),
    ).toBe("not_started");
  });

  it("returns open when any category is open", () => {
    expect(
      ballotVotingReportStatus({
        configured: true,
        openCount: 2,
        closedCount: 1,
        finalizedCount: 0,
        draftCount: 0,
      }),
    ).toBe("open");
  });

  it("returns closed when categories exist but none are open", () => {
    expect(
      ballotVotingReportStatus({
        configured: true,
        openCount: 0,
        closedCount: 3,
        finalizedCount: 1,
        draftCount: 0,
      }),
    ).toBe("closed");
  });
});

describe("isVotingMethodEnabledForEvent", () => {
  const snapshot = {
    publicVoting: { configured: true, status: "open" as const },
    ballot: {
      configured: false,
      openCount: 0,
      closedCount: 0,
      finalizedCount: 0,
      draftCount: 0,
    },
    scoreSheet: { configured: true, status: "OPEN" as const },
  } as EventVotingControlSnapshot;

  it("reflects voting control configured flags", () => {
    expect(isVotingMethodEnabledForEvent("public-voting", snapshot)).toBe(true);
    expect(isVotingMethodEnabledForEvent("judge-ballot", snapshot)).toBe(false);
    expect(isVotingMethodEnabledForEvent("score-sheets", snapshot)).toBe(true);
  });
});

describe("scoreSheetReportStatus", () => {
  it("returns not_started when score sheet judging is not configured", () => {
    expect(
      scoreSheetReportStatus({ configured: false, status: "OPEN" }),
    ).toBe("not_started");
  });

  it("returns open when the judging period is open", () => {
    expect(
      scoreSheetReportStatus({ configured: true, status: "OPEN" }),
    ).toBe("open");
  });

  it("returns closed when the judging period is closed or finalized", () => {
    expect(
      scoreSheetReportStatus({ configured: true, status: "CLOSED" }),
    ).toBe("closed");
    expect(
      scoreSheetReportStatus({ configured: true, status: "FINALIZED" }),
    ).toBe("closed");
  });
});

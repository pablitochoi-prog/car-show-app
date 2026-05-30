import { describe, expect, it } from "vitest";
import {
  buildSmsVotingWindowClosedMessage,
  getSmsVotingWindowStatus,
  isSmsVotingOpenForEvent,
} from "./voting-window";

const baseEvent = {
  smsVotingEnabled: true,
  status: "PUBLISHED" as const,
  smsVotingStartsAt: new Date("2026-06-01T16:00:00.000Z"),
  smsVotingEndsAt: new Date("2026-06-01T22:00:00.000Z"),
};

describe("getSmsVotingWindowStatus", () => {
  it("returns not_started before the window opens", () => {
    const now = new Date("2026-06-01T15:00:00.000Z");
    expect(getSmsVotingWindowStatus(baseEvent, now)).toBe("not_started");
    expect(isSmsVotingOpenForEvent(baseEvent, now)).toBe(false);
  });

  it("returns open during the window", () => {
    const now = new Date("2026-06-01T18:00:00.000Z");
    expect(getSmsVotingWindowStatus(baseEvent, now)).toBe("open");
    expect(isSmsVotingOpenForEvent(baseEvent, now)).toBe(true);
  });

  it("returns ended after the window closes", () => {
    const now = new Date("2026-06-01T23:00:00.000Z");
    expect(getSmsVotingWindowStatus(baseEvent, now)).toBe("ended");
    expect(isSmsVotingOpenForEvent(baseEvent, now)).toBe(false);
  });
});

describe("buildSmsVotingWindowClosedMessage", () => {
  it("includes the voting start date/time when the window has not opened", () => {
    const now = new Date("2026-06-01T15:00:00.000Z");
    const message = buildSmsVotingWindowClosedMessage(
      baseEvent,
      now,
      "America/Los_Angeles",
    );
    expect(message).toContain(
      "The voting window for this event has not opened. Voting starts on",
    );
    expect(message).toContain("June");
  });

  it("includes the voting end date/time when the window has ended", () => {
    const now = new Date("2026-06-01T23:00:00.000Z");
    const message = buildSmsVotingWindowClosedMessage(
      baseEvent,
      now,
      "America/Los_Angeles",
    );
    expect(message).toContain("The voting window for this event ended on");
    expect(message).toContain("June");
  });
});

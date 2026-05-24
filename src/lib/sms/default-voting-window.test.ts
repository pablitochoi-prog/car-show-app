import { describe, expect, it } from "vitest";
import {
  defaultSmsVotingEndsLocal,
  defaultSmsVotingOpensLocal,
} from "./default-voting-window";

describe("defaultSmsVotingWindow", () => {
  it("uses first day start and last day end minus 2 hours for multi-day events", () => {
    const schedule = {
      startDate: "2026-06-01T12:00:00.000Z",
      endDate: "2026-06-02T12:00:00.000Z",
      startTime: "09:00",
      endTime: "17:00",
      dailyHours: [
        {
          date: "2026-06-01",
          startTime: "09:00",
          endTime: "17:00",
          timeZone: "America/Los_Angeles",
        },
        {
          date: "2026-06-02",
          startTime: "10:00",
          endTime: "16:00",
          timeZone: "America/Los_Angeles",
        },
      ],
    };

    expect(defaultSmsVotingOpensLocal(schedule)).toBe("2026-06-01T09:00");
    expect(defaultSmsVotingEndsLocal(schedule)).toBe("2026-06-02T14:00");
  });

  it("uses single-day start/end when dailyHours is absent", () => {
    const schedule = {
      startDate: "2026-07-04T12:00:00.000Z",
      endDate: null,
      startTime: "08:00",
      endTime: "18:00",
      dailyHours: null,
    };

    expect(defaultSmsVotingOpensLocal(schedule)).toBe("2026-07-04T08:00");
    expect(defaultSmsVotingEndsLocal(schedule)).toBe("2026-07-04T16:00");
  });
});

import { describe, expect, it } from "vitest";
import { resolvePublicVotingOpenWindow } from "@/lib/judging/public-voting-open-window";

describe("resolvePublicVotingOpenWindow", () => {
  const now = new Date("2026-06-07T15:00:00.000Z");

  it("moves a future start to 30 minutes ago", () => {
    const futureStart = new Date("2026-06-07T20:00:00.000Z");
    const futureEnd = new Date("2026-06-08T15:00:00.000Z");
    const { startsAt, endsAt } = resolvePublicVotingOpenWindow(
      now,
      futureStart,
      futureEnd,
    );
    expect(startsAt.getTime()).toBe(now.getTime() - 30 * 60 * 1000);
    expect(endsAt).toEqual(futureEnd);
  });

  it("extends a past end by one day and eight hours with immediate start", () => {
    const pastStart = new Date("2026-06-05T10:00:00.000Z");
    const pastEnd = new Date("2026-06-06T10:00:00.000Z");
    const { startsAt, endsAt } = resolvePublicVotingOpenWindow(
      now,
      pastStart,
      pastEnd,
    );
    expect(startsAt.getTime()).toBe(now.getTime() - 30 * 60 * 1000);
    expect(endsAt.getTime()).toBe(now.getTime() + (24 + 8) * 60 * 60 * 1000);
  });
});

import { describe, expect, it } from "vitest";
import {
  awardsVisibleToOwnerAt,
  isEventAwardsVisibleToOwners,
  MY_AWARDS_CEREMONY_DELAY_MS,
} from "@/lib/my-vehicle-awards-publish";

describe("my-vehicle-awards publish delay", () => {
  it("uses a 24-hour ceremony delay", () => {
    expect(MY_AWARDS_CEREMONY_DELAY_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("publishes awards only after finalize plus 24 hours", () => {
    const finalizedAt = new Date("2026-06-01T12:00:00.000Z");
    const visibleAt = awardsVisibleToOwnerAt(finalizedAt);
    expect(visibleAt.toISOString()).toBe("2026-06-02T12:00:00.000Z");

    expect(
      isEventAwardsVisibleToOwners(
        finalizedAt,
        new Date("2026-06-02T11:59:59.000Z"),
      ),
    ).toBe(false);
    expect(
      isEventAwardsVisibleToOwners(
        finalizedAt,
        new Date("2026-06-02T12:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("returns false when finalize timestamp is missing", () => {
    expect(isEventAwardsVisibleToOwners(null)).toBe(false);
  });
});

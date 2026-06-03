import { describe, expect, it } from "vitest";
import { aggregateAssignmentStatus } from "@/lib/judging/judge-assigned-scorecard-data";

describe("aggregateAssignmentStatus", () => {
  it("returns NOT_JUDGED when any category is not judged", () => {
    expect(
      aggregateAssignmentStatus(["SUBMITTED", "NOT_JUDGED", "SAVED_FOR_LATER"]),
    ).toBe("NOT_JUDGED");
  });

  it("returns SAVED_FOR_LATER when none not judged but some saved", () => {
    expect(aggregateAssignmentStatus(["SUBMITTED", "SAVED_FOR_LATER"])).toBe(
      "SAVED_FOR_LATER",
    );
  });

  it("returns SUBMITTED when all submitted", () => {
    expect(aggregateAssignmentStatus(["SUBMITTED", "SUBMITTED"])).toBe("SUBMITTED");
  });
});

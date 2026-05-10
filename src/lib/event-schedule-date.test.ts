import { describe, expect, it } from "vitest";
import { isYmdBeforeLocalToday } from "./event-schedule-date";

describe("isYmdBeforeLocalToday", () => {
  it("is false for empty", () => {
    expect(isYmdBeforeLocalToday("")).toBe(false);
  });

  it("compares ISO date strings", () => {
    expect(isYmdBeforeLocalToday("1900-01-01")).toBe(true);
    expect(isYmdBeforeLocalToday("3000-01-01")).toBe(false);
  });
});

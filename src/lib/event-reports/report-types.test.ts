import { describe, expect, it } from "vitest";
import {
  defaultEventReportType,
  isEventReportTypeId,
} from "./report-types";

describe("event report types", () => {
  it("defaults to voting", () => {
    expect(defaultEventReportType()).toBe("voting");
  });

  it("recognizes valid report ids", () => {
    expect(isEventReportTypeId("voting")).toBe(true);
    expect(isEventReportTypeId("financials")).toBe(true);
    expect(isEventReportTypeId("unknown")).toBe(false);
  });
});

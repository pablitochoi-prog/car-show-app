import { describe, expect, it } from "vitest";
import {
  defaultEventReportType,
  isEventReportTypeId,
  isCsvExportReportId,
  normalizeReportParam,
} from "./report-types";

describe("event report types", () => {
  it("defaults to home", () => {
    expect(defaultEventReportType()).toBe("home");
  });

  it("maps legacy voting param to public-voting", () => {
    expect(normalizeReportParam("voting")).toBe("public-voting");
    expect(normalizeReportParam(undefined)).toBe("home");
  });

  it("recognizes valid report ids", () => {
    expect(isEventReportTypeId("home")).toBe(true);
    expect(isEventReportTypeId("public-voting")).toBe(true);
    expect(isEventReportTypeId("financial")).toBe(true);
    expect(isEventReportTypeId("unknown")).toBe(false);
  });

  it("recognizes csv export ids", () => {
    expect(isCsvExportReportId("registrations")).toBe(true);
    expect(isCsvExportReportId("home")).toBe(false);
  });
});

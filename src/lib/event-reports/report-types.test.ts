import { describe, expect, it } from "vitest";
import {
  CSV_EXPORT_REPORT_IDS,
  EVENT_REPORT_NAV_ORDER,
  EVENT_REPORT_TYPES,
  REPORT_EMPTY_MESSAGES,
  buildReportCsvHref,
  defaultEventReportType,
  getReportsHomeSummary,
  isCsvExportReportId,
  isEventReportTypeId,
  navigableReportTypes,
  normalizeReportParam,
  reportHasRankedRows,
  reportSupportsCsvExport,
  reportsForHomeCards,
} from "./report-types";

describe("event report types", () => {
  it("defaults to home", () => {
    expect(defaultEventReportType()).toBe("home");
  });

  it("maps legacy voting param to public-voting", () => {
    expect(normalizeReportParam("voting")).toBe("public-voting");
    expect(normalizeReportParam(undefined)).toBe("home");
    expect(normalizeReportParam("bogus")).toBe("home");
  });

  it("recognizes valid report ids", () => {
    expect(isEventReportTypeId("home")).toBe(true);
    expect(isEventReportTypeId("public-voting")).toBe(true);
    expect(isEventReportTypeId("financial")).toBe(true);
    expect(isEventReportTypeId("unknown")).toBe(false);
  });

  it("keeps CSV export ids aligned with supportsCsv flags", () => {
    for (const id of CSV_EXPORT_REPORT_IDS) {
      const def = EVENT_REPORT_TYPES.find((r) => r.id === id);
      expect(def?.supportsCsv).toBe(true);
      expect(isCsvExportReportId(id)).toBe(true);
    }

    const csvFlagged = EVENT_REPORT_TYPES.filter((r) => r.supportsCsv).map(
      (r) => r.id,
    );
    expect(csvFlagged.sort()).toEqual([...CSV_EXPORT_REPORT_IDS].sort());
  });

  it("builds CSV href for exportable reports", () => {
    expect(buildReportCsvHref("evt-1", "registrations")).toBe(
      "/api/events/evt-1/reports/registrations/csv",
    );
    expect(reportSupportsCsvExport({ id: "financial", supportsCsv: false })).toBe(
      false,
    );
    expect(
      reportSupportsCsvExport({ id: "staffing", supportsCsv: true }),
    ).toBe(true);
    expect(isCsvExportReportId("home")).toBe(false);
  });

  it("orders navigable reports by event lifecycle", () => {
    const ids = navigableReportTypes().map((r) => r.id);
    expect(ids).toEqual(EVENT_REPORT_NAV_ORDER);
    expect(ids.at(-1)).toBe("awards");
    expect(ids.indexOf("judge-progress")).toBeLessThan(ids.indexOf("awards"));
    expect(ids.indexOf("public-voting")).toBeLessThan(ids.indexOf("judge-ballots"));
  });

  it("orders home cards the same way as nav tabs", () => {
    const homeIds = reportsForHomeCards().map((r) => r.id);
    expect(homeIds).toEqual(EVENT_REPORT_NAV_ORDER);
  });

  it("summarizes home cards", () => {
    const summary = getReportsHomeSummary();
    expect(summary.total).toBe(reportsForHomeCards().length);
    expect(summary.available).toBeGreaterThan(0);
    expect(summary.comingSoon).toBe(2);
    expect(summary.withCsv).toBe(CSV_EXPORT_REPORT_IDS.length);
  });

  it("includes coming-soon reports in navigable tabs", () => {
    const ids = navigableReportTypes().map((r) => r.id);
    expect(ids).toContain("geography");
    expect(ids).toContain("check-in");
    expect(ids).not.toContain("home");
  });

  it("detects ranked rows across sections", () => {
    expect(reportHasRankedRows([{ rows: [] }, { rows: [{ id: 1 }] }])).toBe(
      true,
    );
    expect(reportHasRankedRows([{ rows: [] }])).toBe(false);
  });

  it("documents empty-state copy for separate data sources", () => {
    expect(REPORT_EMPTY_MESSAGES.publicVotingNoVotes).toContain(
      "not score sheet",
    );
    expect(REPORT_EMPTY_MESSAGES.judgeBallotNoVotes).toContain(
      "informal judge ballot",
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  buildAssignmentLookups,
  isSheetSectionSavable,
  normalizeJudgingSectionName,
  resolveSheetSectionAssignment,
} from "@/lib/judging/judge-scorecard-section-assignment";

describe("judge-scorecard-section-assignment", () => {
  const assignments = [
    {
      eventJudgingSectionId: "es-interior",
      status: "NOT_JUDGED" as const,
      sectionName: "Interior",
    },
    {
      eventJudgingSectionId: "es-exterior",
      status: "SAVED_FOR_LATER" as const,
      sectionName: "Exterior",
    },
  ];

  it("normalizes section names for lookup", () => {
    expect(normalizeJudgingSectionName("  Interior ")).toBe("interior");
  });

  it("matches assignment by event section id", () => {
    const lookups = buildAssignmentLookups(assignments);
    const result = resolveSheetSectionAssignment(
      { eventJudgingSectionId: "es-interior", name: "Interior" },
      lookups,
    );
    expect(result.isAssigned).toBe(true);
    expect(result.assignmentStatus).toBe("NOT_JUDGED");
    expect(result.resolvedEventJudgingSectionId).toBe("es-interior");
  });

  it("falls back to section name when sheet event section id is stale", () => {
    const lookups = buildAssignmentLookups(assignments);
    const result = resolveSheetSectionAssignment(
      { eventJudgingSectionId: "old-deleted-id", name: "Interior" },
      lookups,
    );
    expect(result.isAssigned).toBe(true);
    expect(result.assignmentStatus).toBe("NOT_JUDGED");
    expect(result.resolvedEventJudgingSectionId).toBe("es-interior");
  });

  it("falls back to section name when event section id is null", () => {
    const lookups = buildAssignmentLookups(assignments);
    const result = resolveSheetSectionAssignment(
      { eventJudgingSectionId: null, name: "Exterior" },
      lookups,
    );
    expect(result.isAssigned).toBe(true);
    expect(result.resolvedEventJudgingSectionId).toBe("es-exterior");
  });

  it("is savable when event section id matches even if sheet label is stale", () => {
    const lookups = buildAssignmentLookups(assignments);
    expect(
      isSheetSectionSavable(
        {
          eventJudgingSectionId: "es-interior",
          name: "Old Interior Label From Snapshot",
        },
        lookups,
      ),
    ).toBe(true);
  });

  it("is not savable by stale name alone when organizer renamed the category", () => {
    const renamed = buildAssignmentLookups([
      {
        eventJudgingSectionId: "es-cabin",
        status: "NOT_JUDGED",
        sectionName: "Cabin",
      },
    ]);
    expect(
      isSheetSectionSavable(
        { eventJudgingSectionId: "old-id", name: "Interior" },
        renamed,
      ),
    ).toBe(false);
  });
});

describe("findAssignmentsForScoreSheet", () => {
  it("is exported for save/submit flows", async () => {
    const { findAssignmentsForScoreSheet } = await import(
      "@/lib/judging/judge-scorecard-section-assignment"
    );
    expect(typeof findAssignmentsForScoreSheet).toBe("function");
  });
});

import { describe, expect, it } from "vitest";
import {
  deductionOptionsFingerprint,
  isScoreSheetSyncedWithTemplate,
  itemMatchKey,
  sectionMatchKey,
  shouldClearItemDeductions,
} from "@/lib/judging/sync-score-sheet-with-event-template";

describe("sync-score-sheet-with-event-template", () => {
  it("matches sections and items by sort order and label", () => {
    expect(sectionMatchKey({ sortOrder: 1, name: "Interior" })).toBe(
      sectionMatchKey({ sortOrder: 1, name: "Interior" }),
    );
    expect(itemMatchKey({ sortOrder: 0, label: "Carpet" })).toBe(
      itemMatchKey({ sortOrder: 0, label: "Carpet" }),
    );
  });

  it("clears deductions when scoring type changes", () => {
    expect(
      shouldClearItemDeductions(
        {
          scoringType: "LEVELS",
          allowMultipleViolations: false,
          maxPoints: 10,
          deductionOptions: [
            { label: "Minor", pointsDeducted: 1, sortOrder: 0 },
          ],
        },
        {
          scoringType: "FULL",
          allowMultipleViolations: false,
          maxPoints: 10,
          deductionOptions: [
            { label: "Observed", pointsDeducted: 10, sortOrder: 0 },
          ],
        },
      ),
    ).toBe(true);
  });

  it("keeps deductions when only guidance changes", () => {
    expect(
      shouldClearItemDeductions(
        {
          scoringType: "LEVELS",
          allowMultipleViolations: false,
          maxPoints: 10,
          deductionOptions: [
            { label: "Minor", pointsDeducted: 1, sortOrder: 0 },
            { label: "Major", pointsDeducted: 3, sortOrder: 1 },
          ],
        },
        {
          scoringType: "LEVELS",
          allowMultipleViolations: false,
          maxPoints: 10,
          deductionOptions: [
            { label: "Minor", pointsDeducted: 1, sortOrder: 0 },
            { label: "Major", pointsDeducted: 3, sortOrder: 1 },
          ],
        },
      ),
    ).toBe(false);
  });

  it("detects when sheet already matches template", () => {
    expect(
      isScoreSheetSyncedWithTemplate(
        {
          methodology: "DEDUCTION",
          totalPoints: 100,
          sections: [
            {
              id: "s1",
              name: "Interior",
              sortOrder: 0,
              weightPercent: null,
              maxSectionPoints: 50,
              judgeGuidance: null,
              isActive: true,
              eventJudgingSectionId: "es1",
              items: [
                {
                  id: "i1",
                  label: "Carpet",
                  sortOrder: 0,
                  maxPoints: 10,
                  isIndented: false,
                  pointType: null,
                  scoringType: "DISCRETIONARY",
                  allowMultipleViolations: false,
                  judgeGuidance: null,
                  requiresCommentOnDeduction: false,
                  isActive: true,
                  deductionOptions: [],
                  deductions: [],
                },
              ],
            },
          ],
        },
        {
          methodology: "DEDUCTION",
          totalPoints: 100,
          sections: [
            {
              id: "es1",
              name: "Interior",
              sortOrder: 0,
              weightPercent: null,
              maxSectionPoints: 50,
              judgeGuidance: null,
              isActive: true,
              items: [
                {
                  id: "ei1",
                  label: "Carpet",
                  sortOrder: 0,
                  maxPoints: 10,
                  isIndented: false,
                  pointType: null,
                  scoringType: "DISCRETIONARY",
                  allowMultipleViolations: false,
                  judgeGuidance: null,
                  requiresCommentOnDeduction: false,
                  isActive: true,
                  deductionOptions: [],
                },
              ],
            },
          ],
        },
      ),
    ).toBe(true);
  });

  it("treats sheet as synced when only event section id is stale", () => {
    const templateSection = {
      id: "es-new",
      name: "Interior",
      sortOrder: 0,
      weightPercent: null,
      maxSectionPoints: 50,
      judgeGuidance: null,
      isActive: true,
      items: [
        {
          id: "ei1",
          label: "Carpet",
          sortOrder: 0,
          maxPoints: 10,
          isIndented: false,
          pointType: null,
          scoringType: "DISCRETIONARY" as const,
          allowMultipleViolations: false,
          judgeGuidance: null,
          requiresCommentOnDeduction: false,
          isActive: true,
          deductionOptions: [],
        },
      ],
    };
    expect(
      isScoreSheetSyncedWithTemplate(
        {
          methodology: "DEDUCTION",
          totalPoints: 100,
          sections: [
            {
              id: "s1",
              name: "Interior",
              sortOrder: 0,
              weightPercent: null,
              maxSectionPoints: 50,
              judgeGuidance: null,
              isActive: true,
              eventJudgingSectionId: "es-old-deleted",
              items: [
                {
                  id: "i1",
                  label: "Carpet",
                  sortOrder: 0,
                  maxPoints: 10,
                  isIndented: false,
                  pointType: null,
                  scoringType: "DISCRETIONARY",
                  allowMultipleViolations: false,
                  judgeGuidance: null,
                  requiresCommentOnDeduction: false,
                  isActive: true,
                  deductionOptions: [],
                  deductions: [
                    {
                      optionId: null,
                      pointsDeducted: 2,
                      violationCount: 1,
                      discretionaryPoints: 2,
                      comment: null,
                      deductionBucket: null,
                      label: "Deduction",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          methodology: "DEDUCTION",
          totalPoints: 100,
          sections: [templateSection],
        },
      ),
    ).toBe(true);
  });

  it("fingerprints deduction options", () => {
    const a = deductionOptionsFingerprint([
      { label: "Minor", pointsDeducted: 1, sortOrder: 0 },
    ]);
    const b = deductionOptionsFingerprint([
      { label: "Minor", pointsDeducted: 2, sortOrder: 0 },
    ]);
    expect(a).not.toBe(b);
  });
});

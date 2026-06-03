import { describe, expect, it } from "vitest";
import {
  formatTemplateDraftValidationErrors,
  templateDraftToScorecardInput,
  validateTemplateDraft,
} from "@/lib/judging/scorecard-template-mapper";
import type { TemplateDraft } from "@/components/organizer/awards-judging/score-sheet-types";

function minimalDraft(overrides?: Partial<TemplateDraft>): TemplateDraft {
  return {
    name: "Test Template",
    description: "",
    scoringGroup: "PCA",
    vehicleType: "Auto",
    totalPoints: 100,
    methodology: "DEDUCTION",
    sections: [
      {
        clientKey: "sec-1",
        name: "Exterior",
        sortOrder: 0,
        weightPercent: "",
        maxSectionPoints: "100",
        judgeGuidance: "",
        isActive: true,
        items: [
          {
            clientKey: "item-1",
            label: "Paint",
            sortOrder: 0,
            maxPoints: 50,
            isIndented: false,
            pointType: null,
            scoringType: "LEVELS",
            allowMultipleViolations: false,
            judgeGuidance: "Check gloss",
            requiresCommentOnDeduction: false,
            isActive: true,
            deductionOptions: [
              {
                clientKey: "opt-1",
                label: "Minor",
                pointsDeducted: 2,
                sortOrder: 0,
                deductionBucket: null,
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("templateDraftToScorecardInput", () => {
  it("maps header and nested structure for validation", () => {
    const input = templateDraftToScorecardInput(minimalDraft());
    expect(input.methodology).toBe("DEDUCTION");
    expect(input.categories[0]?.name).toBe("Exterior");
    expect(input.categories[0]?.maxSectionPoints).toBe(100);
    expect(input.categories[0]?.subcategories[0]?.incrementLevels).toHaveLength(1);
  });

  it("excludes archived categories from validation input", () => {
    const errors = validateTemplateDraft(
      minimalDraft({
        sections: [
          {
            ...minimalDraft().sections[0]!,
            isActive: false,
            maxSectionPoints: "",
            items: [],
          },
        ],
      }),
    );
    expect(errors.some((e) => e.code === "CATEGORY_MAX_INVALID")).toBe(false);
  });

  it("blocks FULL without exactly one increment", () => {
    const errors = formatTemplateDraftValidationErrors(
      minimalDraft({
        sections: [
          {
            ...minimalDraft().sections[0]!,
            items: [
              {
                ...minimalDraft().sections[0]!.items[0]!,
                scoringType: "FULL",
                deductionOptions: [],
              },
            ],
          },
        ],
      }),
    );
    expect(errors.some((m) => /exactly one increment/i.test(m))).toBe(true);
  });

  it("blocks DISCRETIONARY with multiple violations", () => {
    const errors = formatTemplateDraftValidationErrors(
      minimalDraft({
        sections: [
          {
            ...minimalDraft().sections[0]!,
            items: [
              {
                ...minimalDraft().sections[0]!.items[0]!,
                scoringType: "DISCRETIONARY",
                allowMultipleViolations: true,
                deductionOptions: [],
              },
            ],
          },
        ],
      }),
    );
    expect(errors.some((m) => /cannot use multiple violations/i.test(m))).toBe(true);
  });

  it("blocks subcategory max above category max", () => {
    const errors = formatTemplateDraftValidationErrors(
      minimalDraft({
        sections: [
          {
            ...minimalDraft().sections[0]!,
            maxSectionPoints: "40",
            items: [
              {
                ...minimalDraft().sections[0]!.items[0]!,
                maxPoints: 50,
              },
            ],
          },
        ],
      }),
    );
    expect(errors.some((m) => /cannot exceed the category max/i.test(m))).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import type { TemplateDraft } from "@/components/organizer/awards-judging/score-sheet-types";
import {
  buildScoringTemplateWorkbook,
  parseScoringTemplateExcel,
} from "@/lib/judging/scoring-template-excel";

const sampleDraft: TemplateDraft = {
  name: "Test Concours",
  description: "Sample",
  scoringGroup: "PCA",
  vehicleType: "Concours",
  totalPoints: 100,
  methodology: "DEDUCTION",
  sections: [
    {
      clientKey: "sec-1",
      name: "Exterior",
      sortOrder: 0,
      weightPercent: "",
      maxSectionPoints: "50",
      judgeGuidance: "Check paint",
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
          judgeGuidance: "",
          requiresCommentOnDeduction: true,
          isActive: true,
          deductionOptions: [
            {
              clientKey: "ded-1",
              label: "Minor",
              pointsDeducted: 5,
              sortOrder: 0,
              deductionBucket: null,
            },
          ],
        },
      ],
    },
  ],
};

describe("scoring-template-excel", () => {
  it("round-trips export and import", async () => {
    const buffer = await buildScoringTemplateWorkbook(sampleDraft);
    const parsed = await parseScoringTemplateExcel(buffer);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.data.meta.name).toBe("Test Concours");
    expect(parsed.data.meta.totalPoints).toBe(100);
    expect(parsed.data.meta.methodology).toBe("DEDUCTION");
    expect(parsed.data.sections).toHaveLength(1);
    expect(parsed.data.sections[0]?.name).toBe("Exterior");
    expect(parsed.data.sections[0]?.items[0]?.label).toBe("Paint");
    expect(parsed.data.sections[0]?.items[0]?.requiresCommentOnDeduction).toBe(
      true,
    );
    expect(parsed.data.sections[0]?.items[0]?.deductionOptions[0]?.label).toBe(
      "Minor",
    );
  });

  it("rejects invalid workbook", async () => {
    const parsed = await parseScoringTemplateExcel(Buffer.from("not excel"));
    expect(parsed.ok).toBe(false);
  });
});

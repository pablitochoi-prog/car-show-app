import { describe, expect, it } from "vitest";
import { validateEventJudgingTemplateStructure } from "@/lib/judging/event-judging-template-validation";

describe("event judging template validation", () => {
  it("warns when section totals do not match template total points", () => {
    const warnings = validateEventJudgingTemplateStructure({
      totalPoints: 300,
      sections: [
        {
          name: "Exterior",
          sortOrder: 0,
          maxSectionPoints: 100,
          items: [
            {
              label: "Paint",
              sortOrder: 0,
              maxPoints: 100,
              deductionOptions: [],
            },
          ],
        },
        {
          name: "Interior",
          sortOrder: 1,
          maxSectionPoints: 150,
          items: [
            {
              label: "Upholstery",
              sortOrder: 0,
              maxPoints: 150,
              deductionOptions: [],
            },
          ],
        },
      ],
    });

    expect(warnings.some((w) => w.code === "SECTION_TOTAL_MISMATCH")).toBe(true);
  });

  it("warns when item totals do not match section max points", () => {
    const warnings = validateEventJudgingTemplateStructure({
      totalPoints: 100,
      sections: [
        {
          name: "Exterior",
          sortOrder: 0,
          maxSectionPoints: 100,
          items: [
            {
              label: "Paint",
              sortOrder: 0,
              maxPoints: 40,
              deductionOptions: [],
            },
            {
              label: "Trim",
              sortOrder: 1,
              maxPoints: 40,
              deductionOptions: [],
            },
          ],
        },
      ],
    });

    expect(warnings.some((w) => w.code === "ITEM_TOTAL_MISMATCH")).toBe(true);
  });

  it("passes when section and item totals align", () => {
    const warnings = validateEventJudgingTemplateStructure({
      totalPoints: 100,
      sections: [
        {
          name: "Exterior",
          sortOrder: 0,
          maxSectionPoints: 100,
          items: [
            {
              label: "Paint",
              sortOrder: 0,
              maxPoints: 60,
              deductionOptions: [],
            },
            {
              label: "Trim",
              sortOrder: 1,
              maxPoints: 40,
              deductionOptions: [],
            },
          ],
        },
      ],
    });

    expect(warnings.filter((w) => w.code.includes("MISMATCH"))).toHaveLength(0);
  });
});

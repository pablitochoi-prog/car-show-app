import { describe, expect, it } from "vitest";
import {
  ALL_GLOBAL_JUDGING_TEMPLATE_SEEDS,
  countTemplateNodes,
  globalTemplateSeedToScorecardInput,
  SCORECARD_STARTER_TEMPLATES,
} from "@/lib/judging/seed-templates";
import { PCA_ZONE8_TEMPLATE } from "@/lib/judging/seed-templates/pca-zone8-template";
import { AACA_AUTOMOBILE_TEMPLATE } from "@/lib/judging/seed-templates/aaca-automobile-template";
import { MCA_1968_1972_EXTERIOR_TEMPLATE } from "@/lib/judging/seed-templates/mca-1968-1972-exterior-template";
import { NCRS_1968_1972_EXTERIOR_TEMPLATE } from "@/lib/judging/seed-templates/ncrs-1968-1972-exterior-template";
import {
  isScorecardTemplateValid,
  validateScorecardTemplateStructure,
} from "@/lib/judging/scorecard-template-validation";

describe("global judging template seeds (Phase 5C)", () => {
  it("all seeded templates pass scorecard validation", () => {
    for (const seed of ALL_GLOBAL_JUDGING_TEMPLATE_SEEDS) {
      const input = globalTemplateSeedToScorecardInput(seed);
      expect(
        isScorecardTemplateValid(input),
        `Expected ${seed.slug} to pass validation`,
      ).toBe(true);
      expect(validateScorecardTemplateStructure(input)).toEqual([]);
    }
  });

  it("PCA Zone 8 has six categories and discretionary subcategories", () => {
    expect(PCA_ZONE8_TEMPLATE.scoringGroup).toBe("PCA");
    expect(PCA_ZONE8_TEMPLATE.vehicleType).toBe("Auto");
    expect(PCA_ZONE8_TEMPLATE.methodology).toBe("DEDUCTION");
    expect(PCA_ZONE8_TEMPLATE.categories).toHaveLength(6);
    const counts = countTemplateNodes(PCA_ZONE8_TEMPLATE);
    expect(counts.subcategories).toBe(35);
    for (const cat of PCA_ZONE8_TEMPLATE.categories) {
      for (const sub of cat.subcategories) {
        expect(sub.scoringType).toBe("DISCRETIONARY");
        expect(sub.pointType).toBe("DEDUCT");
        expect(sub.allowMultipleViolations).toBe(false);
        expect(sub.incrementLevels ?? []).toHaveLength(0);
      }
    }
  });

  it("NCRS exterior starter has scoring group and O/C guidance", () => {
    expect(NCRS_1968_1972_EXTERIOR_TEMPLATE.scoringGroup).toBe("NCRS");
    expect(NCRS_1968_1972_EXTERIOR_TEMPLATE.vehicleType).toBe("Auto");
    expect(NCRS_1968_1972_EXTERIOR_TEMPLATE.methodology).toBe("DEDUCTION");
    expect(NCRS_1968_1972_EXTERIOR_TEMPLATE.totalPoints).toBe(1075);
    expect(NCRS_1968_1972_EXTERIOR_TEMPLATE.categories).toHaveLength(26);
    const hardtop = NCRS_1968_1972_EXTERIOR_TEMPLATE.categories.find((c) => c.name === "Hardtop");
    expect(hardtop?.maxSectionPoints).toBe(70);
    expect(hardtop?.judgeGuidance).toMatch(/mutually exclusive/i);
    const sub = NCRS_1968_1972_EXTERIOR_TEMPLATE.categories[1]!.subcategories[0]!;
    expect(sub.judgeGuidance).toMatch(/Originality max/i);
    expect(sub.judgeGuidance).toMatch(/Condition max/i);
    expect(sub.scoringType).toBe("DISCRETIONARY");
    expect(sub.pointType).toBe("DEDUCT");
  });

  it("MCA starter mirrors NCRS structure with MCA metadata", () => {
    expect(MCA_1968_1972_EXTERIOR_TEMPLATE.scoringGroup).toBe("MCA");
    expect(MCA_1968_1972_EXTERIOR_TEMPLATE.description).toMatch(/provided MCA sample/i);
    expect(MCA_1968_1972_EXTERIOR_TEMPLATE.categories).toHaveLength(
      NCRS_1968_1972_EXTERIOR_TEMPLATE.categories.length,
    );
  });

  it("AACA starter has four categories and violation-capable rows", () => {
    expect(AACA_AUTOMOBILE_TEMPLATE.scoringGroup).toBe("AACA");
    expect(AACA_AUTOMOBILE_TEMPLATE.vehicleType).toBe("Auto");
    expect(AACA_AUTOMOBILE_TEMPLATE.methodology).toBe("DEDUCTION");
    expect(AACA_AUTOMOBILE_TEMPLATE.totalPoints).toBe(400);
    expect(AACA_AUTOMOBILE_TEMPLATE.categories.map((c) => c.name)).toEqual([
      "Exterior",
      "Interior",
      "Chassis",
      "Engine",
    ]);
    const withViolations = AACA_AUTOMOBILE_TEMPLATE.categories.flatMap((c) =>
      c.subcategories.filter((s) => s.allowMultipleViolations),
    );
    expect(withViolations.length).toBeGreaterThan(10);
    const otherRows = AACA_AUTOMOBILE_TEMPLATE.categories.flatMap((c) =>
      c.subcategories.filter((s) => s.label === "Other - Identify"),
    );
    expect(otherRows).toHaveLength(4);
    for (const row of otherRows) {
      expect(row.scoringType).toBe("DISCRETIONARY");
      expect(row.allowMultipleViolations).toBe(false);
    }
  });

  it("scorecard starters include four organization templates", () => {
    expect(SCORECARD_STARTER_TEMPLATES.map((t) => t.slug).sort()).toEqual(
      ["aaca", "mca-1968-1972-exterior", "ncrs-1968-1972-exterior", "pca"].sort(),
    );
  });

  it("legacy templates backfill scoring metadata", () => {
    const marque = ALL_GLOBAL_JUDGING_TEMPLATE_SEEDS.find(
      (t) => t.slug === "marque-authenticity",
    )!;
    const modified = ALL_GLOBAL_JUDGING_TEMPLATE_SEEDS.find((t) => t.slug === "modified-custom")!;
    for (const seed of [marque, modified]) {
      expect(seed.scoringGroup).toBe("Custom");
      expect(seed.vehicleType).toBe("Auto");
    }
    expect(marque.methodology).toBe("ORIGINALITY_CONDITION");
    for (const sub of marque.categories.flatMap((c) => c.subcategories)) {
      expect(sub.pointType).toBe("DEDUCT");
      expect(sub.scoringType).toBe("LEVELS");
      expect(sub.incrementLevels?.length).toBeGreaterThan(0);
    }
    expect(modified.methodology).toBe("ADDITIVE");
    for (const sub of modified.categories.flatMap((c) => c.subcategories)) {
      expect(sub.pointType).toBe("ADD");
      expect(sub.scoringType).toBe("DISCRETIONARY");
    }
  });

  it("seed mapper exposes Phase 5 fields for clone parity", () => {
    const input = globalTemplateSeedToScorecardInput(PCA_ZONE8_TEMPLATE);
    const cat = input.categories[0]!;
    const sub = cat.subcategories[0]!;
    expect(sub.scoringType).toBe("DISCRETIONARY");
    expect(sub.pointType).toBe("DEDUCT");
    expect(sub.allowMultipleViolations).toBe(false);
    expect(sub.isIndented).toBe(false);
  });
});

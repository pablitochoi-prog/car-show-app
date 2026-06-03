import type { JudgingMethodology } from "@prisma/client";
import type { TemplateDraft } from "@/components/organizer/awards-judging/score-sheet-types";
import type { TemplateSectionInput } from "@/lib/judging/event-judging-template-validation";
import {
  formatScorecardValidationError,
  validateScorecardTemplateStructure,
  type ScorecardTemplateInput,
  type ScorecardValidationError,
} from "@/lib/judging/scorecard-template-validation";

function parseCategoryMax(section: TemplateDraft["sections"][number]): number | null {
  const trimmed = section.maxSectionPoints.trim();
  if (trimmed === "") return null;
  const n = parseInt(trimmed, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Map organizer template draft to scorecard validation input (active rows only). */
export function templateDraftToScorecardInput(draft: TemplateDraft): ScorecardTemplateInput {
  const activeSections = draft.sections.filter((s) => s.isActive !== false);

  return {
    methodology: draft.methodology as JudgingMethodology,
    totalPoints: draft.totalPoints,
    categories: activeSections.map((section, si) => ({
      name: section.name,
      sortOrder: si,
      maxSectionPoints: parseCategoryMax(section),
      isActive: section.isActive !== false,
      subcategories: section.items
        .filter((item) => item.isActive !== false)
        .map((item, ii) => ({
          label: item.label,
          sortOrder: ii,
          maxPoints: item.maxPoints,
          isIndented: item.isIndented,
          pointType: item.pointType,
          scoringType: item.scoringType,
          allowMultipleViolations: item.allowMultipleViolations ?? false,
          judgeGuidance: item.judgeGuidance.trim() || null,
          isActive: item.isActive !== false,
          incrementLevels:
            item.scoringType === "DISCRETIONARY"
              ? []
              : item.deductionOptions.map((opt, oi) => ({
                  label: opt.label,
                  pointsDeducted: opt.pointsDeducted,
                  sortOrder: oi,
                })),
        })),
    })),
  };
}

export function validateTemplateDraft(
  draft: TemplateDraft,
): ScorecardValidationError[] {
  return validateScorecardTemplateStructure(templateDraftToScorecardInput(draft));
}

export function formatTemplateDraftValidationErrors(draft: TemplateDraft): string[] {
  return validateTemplateDraft(draft).map(formatScorecardValidationError);
}

/** Map API structure payload to scorecard validation input. */
export function structurePayloadToScorecardInput(
  methodology: JudgingMethodology,
  totalPoints: number,
  sections: TemplateSectionInput[],
): ScorecardTemplateInput {
  const activeSections = sections.filter((s) => s.isActive !== false);

  return {
    methodology,
    totalPoints,
    categories: activeSections.map((section, si) => {
      const activeItems = section.items.filter((i) => i.isActive !== false);
      const maxSectionPoints =
        section.maxSectionPoints != null && section.maxSectionPoints > 0
          ? section.maxSectionPoints
          : null;

      return {
        name: section.name,
        sortOrder: si,
        maxSectionPoints,
        isActive: section.isActive !== false,
        subcategories: activeItems.map((item, ii) => ({
          label: item.label,
          sortOrder: ii,
          maxPoints: item.maxPoints,
          isIndented: item.isIndented ?? false,
          pointType: item.pointType ?? null,
          scoringType: item.scoringType ?? "LEVELS",
          allowMultipleViolations: item.allowMultipleViolations ?? false,
          judgeGuidance: item.judgeGuidance ?? null,
          isActive: item.isActive !== false,
          incrementLevels:
            item.scoringType === "DISCRETIONARY"
              ? []
              : item.deductionOptions.map((opt, oi) => ({
                  label: opt.label,
                  pointsDeducted: opt.pointsDeducted,
                  sortOrder: oi,
                })),
        })),
      };
    }),
  };
}

export function validateStructurePayload(
  methodology: JudgingMethodology,
  totalPoints: number,
  sections: TemplateSectionInput[],
): ScorecardValidationError[] {
  return validateScorecardTemplateStructure(
    structurePayloadToScorecardInput(methodology, totalPoints, sections),
  );
}

import type {
  JudgingSubcategoryPointType,
  JudgingSubcategoryScoringType,
} from "@prisma/client";

export type TemplateSectionInput = {
  id?: string;
  name: string;
  sortOrder: number;
  weightPercent?: number | null;
  maxSectionPoints?: number | null;
  judgeGuidance?: string | null;
  isActive?: boolean;
  items: TemplateItemInput[];
};

export type TemplateItemInput = {
  id?: string;
  label: string;
  sortOrder: number;
  maxPoints: number;
  isIndented?: boolean;
  pointType?: JudgingSubcategoryPointType | null;
  scoringType?: JudgingSubcategoryScoringType;
  allowMultipleViolations?: boolean;
  judgeGuidance?: string | null;
  requiresCommentOnDeduction?: boolean;
  isActive?: boolean;
  deductionOptions: TemplateDeductionInput[];
};

export type TemplateDeductionInput = {
  id?: string;
  label: string;
  pointsDeducted: number;
  sortOrder: number;
  deductionBucket?: "ORIGINALITY" | "CONDITION" | null;
};

export type TemplateValidationWarning = {
  code: "SECTION_TOTAL_MISMATCH" | "ITEM_TOTAL_MISMATCH" | "EMPTY_SECTION" | "EMPTY_ITEM";
  message: string;
  sectionIndex?: number;
  itemIndex?: number;
};

export function validateEventJudgingTemplateStructure(input: {
  totalPoints: number;
  sections: TemplateSectionInput[];
}): TemplateValidationWarning[] {
  const warnings: TemplateValidationWarning[] = [];
  const { totalPoints, sections } = input;

  let sectionPointSum = 0;
  for (let si = 0; si < sections.length; si++) {
    const section = sections[si];
    if (section.isActive === false) continue;
    const activeItems = section.items.filter((i) => i.isActive !== false);
    if (activeItems.length === 0) {
      warnings.push({
        code: "EMPTY_SECTION",
        message: `Category "${section.name}" has no subcategories.`,
        sectionIndex: si,
      });
    }

    const sectionMax =
      section.maxSectionPoints ??
      activeItems.reduce((sum, item) => sum + (item.maxPoints || 0), 0);
    sectionPointSum += sectionMax;

    let itemSum = 0;
    for (let ii = 0; ii < activeItems.length; ii++) {
      const item = activeItems[ii];
      itemSum += item.maxPoints || 0;
      if (!item.label.trim()) {
        warnings.push({
          code: "EMPTY_ITEM",
          message: `Category "${section.name}" has a subcategory without a label.`,
          sectionIndex: si,
          itemIndex: ii,
        });
      }
    }

    if (
      section.maxSectionPoints != null &&
      activeItems.length > 0 &&
      itemSum !== section.maxSectionPoints
    ) {
      warnings.push({
        code: "ITEM_TOTAL_MISMATCH",
        message: `Section "${section.name}" criteria total (${itemSum}) does not match section max (${section.maxSectionPoints}).`,
        sectionIndex: si,
      });
    }
  }

  if (sections.length > 0 && sectionPointSum !== totalPoints) {
    warnings.push({
      code: "SECTION_TOTAL_MISMATCH",
      message: `Section totals (${sectionPointSum}) do not match template total points (${totalPoints}).`,
    });
  }

  return warnings;
}

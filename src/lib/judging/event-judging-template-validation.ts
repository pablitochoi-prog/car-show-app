export type TemplateSectionInput = {
  id?: string;
  name: string;
  sortOrder: number;
  weightPercent?: number | null;
  maxSectionPoints?: number | null;
  judgeGuidance?: string | null;
  items: TemplateItemInput[];
};

export type TemplateItemInput = {
  id?: string;
  label: string;
  sortOrder: number;
  maxPoints: number;
  judgeGuidance?: string | null;
  requiresCommentOnDeduction?: boolean;
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
    if (section.items.length === 0) {
      warnings.push({
        code: "EMPTY_SECTION",
        message: `Section "${section.name}" has no criteria items.`,
        sectionIndex: si,
      });
    }

    const sectionMax =
      section.maxSectionPoints ??
      section.items.reduce((sum, item) => sum + (item.maxPoints || 0), 0);
    sectionPointSum += sectionMax;

    let itemSum = 0;
    for (let ii = 0; ii < section.items.length; ii++) {
      const item = section.items[ii];
      itemSum += item.maxPoints || 0;
      if (!item.label.trim()) {
        warnings.push({
          code: "EMPTY_ITEM",
          message: `Section "${section.name}" has a criteria item without a label.`,
          sectionIndex: si,
          itemIndex: ii,
        });
      }
    }

    if (
      section.maxSectionPoints != null &&
      section.items.length > 0 &&
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

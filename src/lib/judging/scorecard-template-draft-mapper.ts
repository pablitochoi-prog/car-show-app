import type { TemplateDraft } from "@/components/organizer/awards-judging/score-sheet-types";

export type ApiScoreSheetTemplate = {
  name: string;
  description: string | null;
  scoringGroup?: string | null;
  vehicleType?: string | null;
  methodology: TemplateDraft["methodology"];
  totalPoints: number;
  sections: {
    id: string;
    name: string;
    sortOrder: number;
    weightPercent: number | null;
    maxSectionPoints: number | null;
    judgeGuidance: string | null;
    isActive: boolean;
    items: {
      id: string;
      label: string;
      sortOrder: number;
      maxPoints: number;
      isIndented: boolean;
      pointType: "ADD" | "DEDUCT" | null;
      scoringType: "FULL" | "LEVELS" | "DISCRETIONARY";
      allowMultipleViolations: boolean;
      judgeGuidance: string | null;
      requiresCommentOnDeduction: boolean;
      isActive: boolean;
      deductionOptions: {
        id: string;
        label: string;
        pointsDeducted: number;
        sortOrder: number;
        deductionBucket: "ORIGINALITY" | "CONDITION" | null;
      }[];
    }[];
  }[];
  _count?: { eventCopies?: number; scoreSheets?: number };
};

export function apiTemplateToDraft(template: ApiScoreSheetTemplate): TemplateDraft {
  return {
    name: template.name,
    description: template.description ?? "",
    scoringGroup: template.scoringGroup ?? "",
    vehicleType: template.vehicleType ?? "",
    totalPoints: template.totalPoints,
    methodology: template.methodology,
    sections: template.sections.map((section) => ({
      clientKey: section.id,
      name: section.name,
      sortOrder: section.sortOrder,
      weightPercent:
        section.weightPercent != null ? String(section.weightPercent) : "",
      maxSectionPoints:
        section.maxSectionPoints != null ? String(section.maxSectionPoints) : "",
      judgeGuidance: section.judgeGuidance ?? "",
      isActive: section.isActive,
      items: section.items.map((item) => ({
        clientKey: item.id,
        label: item.label,
        sortOrder: item.sortOrder,
        maxPoints: item.maxPoints,
        isIndented: item.isIndented,
        pointType: item.pointType,
        scoringType: item.scoringType,
        allowMultipleViolations: item.allowMultipleViolations,
        judgeGuidance: item.judgeGuidance ?? "",
        requiresCommentOnDeduction: item.requiresCommentOnDeduction,
        isActive: item.isActive,
        deductionOptions: item.deductionOptions.map((opt) => ({
          clientKey: opt.id,
          label: opt.label,
          pointsDeducted: opt.pointsDeducted,
          sortOrder: opt.sortOrder,
          deductionBucket: opt.deductionBucket,
        })),
      })),
    })),
  };
}

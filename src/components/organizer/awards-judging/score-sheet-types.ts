import type {
  JudgingMethodology,
  JudgingSubcategoryPointType,
  JudgingSubcategoryScoringType,
} from "@prisma/client";

export type VehicleClassOption = { id: string; label: string };

export type SourceTemplate = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  methodology: string;
  totalPoints: number;
  scoringGroup?: string | null;
  vehicleType?: string | null;
  sectionCount: number;
};

export type EventTemplateSummary = {
  id: string;
  name: string;
  description: string | null;
  methodology: string;
  totalPoints: number;
  scoringGroup?: string | null;
  vehicleType?: string | null;
  editLock: string;
  sourceTemplate: { id: string; slug: string; name: string } | null;
  _count: { sections: number; scoreSheets: number };
};

export type DeductionDraft = {
  clientKey: string;
  label: string;
  pointsDeducted: number;
  sortOrder: number;
  deductionBucket: "ORIGINALITY" | "CONDITION" | null;
};

export type ItemDraft = {
  clientKey: string;
  label: string;
  sortOrder: number;
  maxPoints: number;
  isIndented: boolean;
  pointType: JudgingSubcategoryPointType | null;
  scoringType: JudgingSubcategoryScoringType;
  allowMultipleViolations: boolean;
  judgeGuidance: string;
  requiresCommentOnDeduction: boolean;
  deductionOptions: DeductionDraft[];
  isActive: boolean;
  guidanceOpen?: boolean;
};

export type SectionDraft = {
  clientKey: string;
  name: string;
  sortOrder: number;
  weightPercent: string;
  maxSectionPoints: string;
  judgeGuidance: string;
  items: ItemDraft[];
  isActive: boolean;
  guidanceOpen?: boolean;
};

export type TemplateDraft = {
  name: string;
  description: string;
  scoringGroup: string;
  vehicleType: string;
  totalPoints: number;
  methodology: JudgingMethodology;
  sections: SectionDraft[];
};

export type EditLockInfo = {
  editLock: string;
  draftCount: number;
  submittedCount: number;
  finalizedCount: number;
  canEditStructure: boolean;
  canEditGuidance: boolean;
  showDraftWarning: boolean;
  scoreSheetCount: number;
};

export type ValidationWarning = {
  code: string;
  message: string;
};

export type JudgingClassRow = {
  id: string;
  name: string;
  description: string | null;
  eventJudgingTemplateId: string;
  templateName: string;
  isActive: boolean;
  sortOrder: number;
  eligibleEventCategoryIds: string[];
  eligibleVehicleClasses: { id: string; label: string }[];
};

export function newClientKey(): string {
  return `tmp-${crypto.randomUUID()}`;
}

export function isPersistedClientKey(key: string): boolean {
  return !key.startsWith("tmp-");
}

export function defaultItemDraft(sortOrder: number): ItemDraft {
  return {
    clientKey: newClientKey(),
    label: "New Subcategory",
    sortOrder,
    maxPoints: 10,
    isIndented: false,
    pointType: null,
    scoringType: "LEVELS",
    allowMultipleViolations: false,
    judgeGuidance: "",
    requiresCommentOnDeduction: false,
    deductionOptions: [],
    isActive: true,
  };
}

export function defaultSectionDraft(sortOrder: number): SectionDraft {
  return {
    clientKey: newClientKey(),
    name: "New Category",
    sortOrder,
    weightPercent: "",
    maxSectionPoints: "",
    judgeGuidance: "",
    items: [],
    isActive: true,
  };
}

export function sectionPointsTotal(section: SectionDraft): number {
  const explicit = parseInt(section.maxSectionPoints, 10);
  if (!Number.isNaN(explicit) && section.maxSectionPoints.trim() !== "") {
    return explicit;
  }
  return section.items
    .filter((i) => i.isActive !== false)
    .reduce((sum, item) => sum + (item.maxPoints || 0), 0);
}

export function itemPointsTotal(section: SectionDraft): number {
  return section.items
    .filter((i) => i.isActive !== false)
    .reduce((sum, item) => sum + (item.maxPoints || 0), 0);
}

export function templateSectionsTotal(draft: TemplateDraft): number {
  return draft.sections
    .filter((s) => s.isActive !== false)
    .reduce((sum, section) => sum + sectionPointsTotal(section), 0);
}

export function toStructurePayload(draft: TemplateDraft) {
  return {
    totalPoints: draft.totalPoints,
    scoringGroup: draft.scoringGroup.trim() || null,
    vehicleType: draft.vehicleType.trim() || null,
    methodology: draft.methodology,
    sections: draft.sections.map((section, si) => ({
      name: section.name,
      sortOrder: si,
      weightPercent:
        section.weightPercent.trim() === ""
          ? null
          : parseFloat(section.weightPercent),
      maxSectionPoints:
        section.maxSectionPoints.trim() === ""
          ? null
          : parseInt(section.maxSectionPoints, 10),
      judgeGuidance: section.judgeGuidance.trim() || null,
      isActive: section.isActive !== false,
      items: section.items.map((item, ii) => ({
        label: item.label,
        sortOrder: ii,
        maxPoints: item.maxPoints,
        isIndented: item.isIndented,
        pointType: item.pointType,
        scoringType: item.scoringType,
        allowMultipleViolations:
          item.scoringType === "DISCRETIONARY"
            ? false
            : item.allowMultipleViolations,
        judgeGuidance: item.judgeGuidance.trim() || null,
        requiresCommentOnDeduction: item.requiresCommentOnDeduction,
        isActive: item.isActive !== false,
        deductionOptions:
          item.scoringType === "DISCRETIONARY"
            ? []
            : item.deductionOptions.map((opt, oi) => ({
                label: opt.label,
                pointsDeducted: opt.pointsDeducted,
                sortOrder: oi,
                deductionBucket: opt.deductionBucket,
              })),
      })),
    })),
  };
}

export const SCORING_GROUP_PRESETS = ["AACA", "PCA", "NCRS", "MCA", "Custom"] as const;
export const VEHICLE_TYPE_PRESETS = [
  "Auto",
  "Trike",
  "Survivor",
  "Motorcycle",
] as const;

export const METHODOLOGY_OPTIONS: Array<{
  value: "DEDUCTION" | "ADDITIVE";
  label: string;
  hint: string;
}> = [
  {
    value: "DEDUCTION",
    label: "D — Deduction",
    hint: "Starts from perfect score and deducts points.",
  },
  {
    value: "ADDITIVE",
    label: "A — Additive",
    hint: "Starts at 0 and adds points.",
  },
];

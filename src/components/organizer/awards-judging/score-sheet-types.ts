export type VehicleClassOption = { id: string; label: string };

export type SourceTemplate = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  methodology: string;
  totalPoints: number;
  sectionCount: number;
};

export type EventTemplateSummary = {
  id: string;
  name: string;
  description: string | null;
  methodology: string;
  totalPoints: number;
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
  judgeGuidance: string;
  requiresCommentOnDeduction: boolean;
  deductionOptions: DeductionDraft[];
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
  guidanceOpen?: boolean;
};

export type TemplateDraft = {
  name: string;
  description: string;
  totalPoints: number;
  methodology: string;
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

export function sectionPointsTotal(section: SectionDraft): number {
  const explicit = parseInt(section.maxSectionPoints, 10);
  if (!Number.isNaN(explicit) && section.maxSectionPoints.trim() !== "") {
    return explicit;
  }
  return section.items.reduce((sum, item) => sum + (item.maxPoints || 0), 0);
}

export function itemPointsTotal(section: SectionDraft): number {
  return section.items.reduce((sum, item) => sum + (item.maxPoints || 0), 0);
}

export function templateSectionsTotal(draft: TemplateDraft): number {
  return draft.sections.reduce((sum, section) => sum + sectionPointsTotal(section), 0);
}

export function toStructurePayload(draft: TemplateDraft) {
  return {
    totalPoints: draft.totalPoints,
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
      items: section.items.map((item, ii) => ({
        label: item.label,
        sortOrder: ii,
        maxPoints: item.maxPoints,
        judgeGuidance: item.judgeGuidance.trim() || null,
        requiresCommentOnDeduction: item.requiresCommentOnDeduction,
        deductionOptions: item.deductionOptions.map((opt, oi) => ({
          label: opt.label,
          pointsDeducted: opt.pointsDeducted,
          sortOrder: oi,
          deductionBucket: opt.deductionBucket,
        })),
      })),
    })),
  };
}

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
  sortOrder: number;
  editLock: string;
  judgingClassId: string | null;
  eligibleEventCategoryIds: string[];
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

const LEVEL_INCREMENT_LABELS = ["Minor", "Major", "Critical"] as const;

/** Default increment levels for Pre-defined Levels scoring. */
export function defaultLevelsDeductionOptions(maxPoints = 10): DeductionDraft[] {
  const cap = Math.max(1, maxPoints);
  const rawPoints = [
    Math.max(1, Math.round(cap * 0.25)),
    Math.max(1, Math.round(cap * 0.5)),
    cap,
  ];
  return LEVEL_INCREMENT_LABELS.map((label, i) => ({
    clientKey: newClientKey(),
    label,
    pointsDeducted: Math.min(rawPoints[i]!, cap),
    sortOrder: i,
    deductionBucket: null,
  }));
}

/** Single increment row for All or nothing (stores per-violation or full deduction points). */
export function defaultFullDeductionOption(
  item: Pick<ItemDraft, "maxPoints" | "allowMultipleViolations">,
  existing?: DeductionDraft,
  options?: { preservePointValue?: boolean },
): DeductionDraft {
  const multiple = item.allowMultipleViolations;
  const max = Math.max(1, item.maxPoints);
  const modeDefault = multiple ? 1 : max;
  const points = options?.preservePointValue
    ? Math.min(Math.max(1, existing?.pointsDeducted ?? modeDefault), max)
    : modeDefault;
  return {
    clientKey: existing?.clientKey ?? newClientKey(),
    label: multiple ? "Per violation" : "If observed",
    pointsDeducted: points,
    sortOrder: 0,
    deductionBucket: existing?.deductionBucket ?? null,
  };
}

export function patchItemAllowMultipleViolations(
  item: ItemDraft,
  allowMultipleViolations: boolean,
): ItemDraft {
  if (item.scoringType !== "FULL") {
    return { ...item, allowMultipleViolations };
  }
  const next = { ...item, allowMultipleViolations };
  return {
    ...next,
    deductionOptions: [
      defaultFullDeductionOption(next, item.deductionOptions[0]),
    ],
  };
}

export function patchItemFullPointValue(item: ItemDraft, pointsDeducted: number): ItemDraft {
  const max = Math.max(1, item.maxPoints);
  const pts = Math.min(Math.max(1, pointsDeducted), max);
  const opt = defaultFullDeductionOption(item, item.deductionOptions[0], {
    preservePointValue: true,
  });
  return {
    ...item,
    deductionOptions: [{ ...opt, pointsDeducted: pts }],
  };
}

export function syncItemMaxPoints(item: ItemDraft, maxPoints: number): ItemDraft {
  const next = { ...item, maxPoints: Math.max(1, maxPoints) };
  if (next.scoringType === "FULL" && !next.allowMultipleViolations) {
    return patchItemFullPointValue(next, next.maxPoints);
  }
  if (next.scoringType === "FULL" && next.allowMultipleViolations) {
    const opt = defaultFullDeductionOption(next, next.deductionOptions[0]);
    return {
      ...next,
      deductionOptions: [
        {
          ...opt,
          pointsDeducted: Math.min(opt.pointsDeducted, next.maxPoints),
        },
      ],
    };
  }
  return next;
}

export function patchItemScoringType(
  item: ItemDraft,
  scoringType: JudgingSubcategoryScoringType,
): ItemDraft {
  if (scoringType === "DISCRETIONARY") {
    return {
      ...item,
      scoringType,
      allowMultipleViolations: false,
      deductionOptions: [],
    };
  }
  if (scoringType === "FULL") {
    const preserve = item.scoringType === "FULL";
    return {
      ...item,
      scoringType,
      deductionOptions: [
        defaultFullDeductionOption(
          item,
          item.deductionOptions[0],
          { preservePointValue: preserve },
        ),
      ],
    };
  }
  // LEVELS (Pre-defined Levels)
  const shouldSeedDefaults =
    item.scoringType !== "LEVELS" || item.deductionOptions.length === 0;
  return {
    ...item,
    scoringType,
    deductionOptions: shouldSeedDefaults
      ? defaultLevelsDeductionOptions(item.maxPoints)
      : item.deductionOptions,
  };
}

export function defaultItemDraft(sortOrder: number): ItemDraft {
  const maxPoints = 10;
  return {
    clientKey: newClientKey(),
    label: "New Subcategory",
    sortOrder,
    maxPoints,
    isIndented: false,
    pointType: null,
    scoringType: "LEVELS",
    allowMultipleViolations: false,
    judgeGuidance: "",
    requiresCommentOnDeduction: false,
    deductionOptions: defaultLevelsDeductionOptions(maxPoints),
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
      ...(isPersistedClientKey(section.clientKey)
        ? { id: section.clientKey }
        : {}),
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
        ...(isPersistedClientKey(item.clientKey) ? { id: item.clientKey } : {}),
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
  "Concours",
  "Auto",
  "Trike",
  "Survivor",
  "Motorcycle",
] as const;

export const SCORING_TYPE_OPTIONS: Array<{
  value: JudgingSubcategoryScoringType;
  label: string;
  hint: string;
}> = [
  {
    value: "FULL",
    label: "All or nothing",
    hint:
      'All or nothing: set a point value for the subcategory. Without multiple violations, the judge applies the full amount when observed. With multiple violations enabled, set points per violation (e.g. 1 pt each); total deduction is capped at the subcategory maximum.',
  },
  {
    value: "LEVELS",
    label: "Pre-defined Levels",
    hint:
      '"Pre-defined Levels" allows the event organizer to display standard judging labels with predefined adjustment amounts that can be quickly selected by the judge (e.g., Minor, Major, Critical). Pre-defined levels can allow only a single deduction or multiple deductions based on the number of observations to allow for a larger adjustment for multiple instances of the same subcategory (up to a subcategory maximum deduction).',
  },
  {
    value: "DISCRETIONARY",
    label: "Discretionary",
    hint:
      "Judge enters a numeric value from zero through the subcategory maximum score.",
  },
];

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

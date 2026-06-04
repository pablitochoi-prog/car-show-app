import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  itemMatchKey,
  sectionMatchKey,
  shouldReplaceDeductionOptions,
} from "@/lib/judging/judging-structure-match";

export {
  deductionOptionsFingerprint,
  itemMatchKey,
  sectionMatchKey,
} from "@/lib/judging/judging-structure-match";

type TemplateSection = Prisma.EventJudgingSectionGetPayload<{
  include: {
    items: {
      include: { deductionOptions: true };
    };
  };
}>;

type TemplateItem = TemplateSection["items"][number];

type SheetSection = Prisma.JudgeScoreSheetSectionGetPayload<{
  include: {
    items: {
      include: {
        deductionOptions: true;
        deductions: true;
      };
    };
  };
}>;

type SheetItem = SheetSection["items"][number];

type SheetWithSections = Prisma.JudgeScoreSheetGetPayload<{
  include: {
    sections: {
      include: {
        items: {
          include: {
            deductionOptions: true;
            deductions: true;
          };
        };
      };
    };
  };
}>;

type TemplateWithSections = Prisma.EventJudgingTemplateGetPayload<{
  include: {
    sections: {
      include: {
        items: {
          include: { deductionOptions: true };
        };
      };
    };
  };
}>;

const TX_OPTIONS = { maxWait: 15_000, timeout: 60_000 } as const;

export function shouldClearItemDeductions(
  sheetItem: Pick<
    SheetItem,
    "scoringType" | "allowMultipleViolations" | "maxPoints"
  > & {
    deductionOptions: Array<{
      label: string;
      pointsDeducted: number;
      sortOrder: number;
    }>;
  },
  templateItem: Pick<
    TemplateItem,
    "scoringType" | "allowMultipleViolations" | "maxPoints"
  > & {
    deductionOptions: TemplateItem["deductionOptions"];
  },
): boolean {
  return shouldReplaceDeductionOptions(sheetItem, {
    scoringType: templateItem.scoringType,
    allowMultipleViolations: templateItem.allowMultipleViolations,
    maxPoints: templateItem.maxPoints,
    deductionOptions: templateItem.deductionOptions,
  });
}

function itemMetadataMatches(sheetItem: SheetItem, templateItem: TemplateItem): boolean {
  return (
    sheetItem.label.trim() === templateItem.label.trim() &&
    sheetItem.sortOrder === templateItem.sortOrder &&
    sheetItem.maxPoints === templateItem.maxPoints &&
    sheetItem.isIndented === templateItem.isIndented &&
    sheetItem.pointType === templateItem.pointType &&
    sheetItem.scoringType === templateItem.scoringType &&
    sheetItem.allowMultipleViolations === templateItem.allowMultipleViolations &&
    (sheetItem.judgeGuidance ?? "") === (templateItem.judgeGuidance ?? "") &&
    sheetItem.requiresCommentOnDeduction === templateItem.requiresCommentOnDeduction &&
    sheetItem.isActive === templateItem.isActive &&
    !shouldClearItemDeductions(sheetItem, templateItem)
  );
}

function sectionStructureMatches(
  sheetSection: SheetSection,
  templateSection: TemplateSection,
): boolean {
  return (
    sheetSection.name.trim() === templateSection.name.trim() &&
    sheetSection.sortOrder === templateSection.sortOrder &&
    sheetSection.weightPercent === templateSection.weightPercent &&
    sheetSection.maxSectionPoints === templateSection.maxSectionPoints &&
    (sheetSection.judgeGuidance ?? "") === (templateSection.judgeGuidance ?? "") &&
    sheetSection.isActive
  );
}

function sectionMetadataMatches(
  sheetSection: SheetSection,
  templateSection: TemplateSection,
): boolean {
  return (
    sectionStructureMatches(sheetSection, templateSection) &&
    sheetSection.eventJudgingSectionId === templateSection.id
  );
}

/** True when the draft sheet already matches the live template (skip DB writes). */
export function isScoreSheetSyncedWithTemplate(
  sheet: Pick<SheetWithSections, "methodology" | "totalPoints" | "sections">,
  template: Pick<TemplateWithSections, "methodology" | "totalPoints" | "sections">,
): boolean {
  if (sheet.methodology !== template.methodology) return false;
  if (sheet.totalPoints !== template.totalPoints) return false;

  const activeSheetSections = sheet.sections.filter((s) => s.isActive);

  for (const templateSection of template.sections) {
    const sheetSection = findSheetSectionForTemplate(templateSection, activeSheetSections);
    if (!sheetSection || !sectionStructureMatches(sheetSection, templateSection)) {
      return false;
    }

    const activeSheetItems = sheetSection.items.filter((i) => i.isActive);
    for (const templateItem of templateSection.items) {
      const sheetItem = findSheetItemForTemplate(templateItem, activeSheetItems);
      if (!sheetItem || !itemMetadataMatches(sheetItem, templateItem)) {
        return false;
      }
    }

    if (
      activeSheetItems.length !==
      templateSection.items.filter((i) => i.isActive).length
    ) {
      return false;
    }
  }

  const templateSectionKeys = new Set(
    template.sections.map((s) => sectionMatchKey(s)),
  );
  for (const sheetSection of activeSheetSections) {
    if (!templateSectionKeys.has(sectionMatchKey(sheetSection))) {
      return false;
    }
  }

  return true;
}

function findSheetSectionForTemplate(
  templateSection: TemplateSection,
  sheetSections: SheetSection[],
): SheetSection | undefined {
  const byEventId = sheetSections.find(
    (s) => s.eventJudgingSectionId === templateSection.id,
  );
  if (byEventId) return byEventId;
  const key = sectionMatchKey(templateSection);
  return sheetSections.find((s) => sectionMatchKey(s) === key);
}

function findSheetItemForTemplate(
  templateItem: TemplateItem,
  sheetItems: SheetItem[],
): SheetItem | undefined {
  const key = itemMatchKey(templateItem);
  return sheetItems.find((i) => itemMatchKey(i) === key);
}

function findRemappedSheetOption(
  oldOption: SheetItem["deductionOptions"][number],
  newOptions: SheetItem["deductionOptions"],
): SheetItem["deductionOptions"][number] | undefined {
  return newOptions.find(
    (o) =>
      o.label.trim() === oldOption.label.trim() &&
      o.pointsDeducted === oldOption.pointsDeducted &&
      o.sortOrder === oldOption.sortOrder,
  );
}

async function syncSheetItemFromTemplate(
  tx: Prisma.TransactionClient,
  sheetItem: SheetItem,
  templateItem: TemplateItem,
): Promise<void> {
  const structureChanged = shouldClearItemDeductions(sheetItem, templateItem);
  const preservedDeductions = structureChanged ? [...sheetItem.deductions] : [];
  const oldOptions = structureChanged ? [...sheetItem.deductionOptions] : [];

  await tx.judgeScoreSheetItem.update({
    where: { id: sheetItem.id },
    data: {
      label: templateItem.label,
      sortOrder: templateItem.sortOrder,
      maxPoints: templateItem.maxPoints,
      isIndented: templateItem.isIndented,
      pointType: templateItem.pointType,
      scoringType: templateItem.scoringType,
      allowMultipleViolations: templateItem.allowMultipleViolations,
      judgeGuidance: templateItem.judgeGuidance,
      requiresCommentOnDeduction: templateItem.requiresCommentOnDeduction,
      isActive: true,
    },
  });

  if (!structureChanged) return;

  await tx.judgeScoreSheetDeduction.deleteMany({ where: { itemId: sheetItem.id } });
  await tx.judgeScoreSheetDeductionOption.deleteMany({ where: { itemId: sheetItem.id } });

  if (templateItem.deductionOptions.length > 0) {
    await tx.judgeScoreSheetDeductionOption.createMany({
      data: templateItem.deductionOptions.map((opt) => ({
        itemId: sheetItem.id,
        label: opt.label,
        pointsDeducted: opt.pointsDeducted,
        sortOrder: opt.sortOrder,
        deductionBucket: opt.deductionBucket,
      })),
    });
  }

  const newOptions = await tx.judgeScoreSheetDeductionOption.findMany({
    where: { itemId: sheetItem.id },
    orderBy: { sortOrder: "asc" },
  });

  for (const deduction of preservedDeductions) {
    if (deduction.discretionaryPoints != null) {
      const pts = Math.round(deduction.discretionaryPoints);
      if (pts > 0) {
        await tx.judgeScoreSheetDeduction.create({
          data: {
            itemId: sheetItem.id,
            label: deduction.label,
            pointsDeducted: deduction.pointsDeducted,
            discretionaryPoints: pts,
            violationCount: deduction.violationCount,
            comment: deduction.comment,
            deductionBucket: deduction.deductionBucket,
          },
        });
      }
      continue;
    }

    if (!deduction.optionId) continue;
    const oldOpt = oldOptions.find((o) => o.id === deduction.optionId);
    const newOpt = oldOpt ? findRemappedSheetOption(oldOpt, newOptions) : undefined;
    if (!newOpt) continue;

    await tx.judgeScoreSheetDeduction.create({
      data: {
        itemId: sheetItem.id,
        optionId: newOpt.id,
        label: newOpt.label,
        pointsDeducted: newOpt.pointsDeducted,
        violationCount: deduction.violationCount,
        comment: deduction.comment,
        deductionBucket: deduction.deductionBucket,
      },
    });
  }
}

/**
 * Aligns a DRAFT judge score sheet with the live event judging template so
 * scoring types, max points, and deduction options reflect organizer edits.
 */
export async function syncJudgeScoreSheetWithEventTemplate(
  sheetId: string,
): Promise<boolean> {
  const sheet = await prisma.judgeScoreSheet.findUnique({
    where: { id: sheetId },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
            include: {
              deductionOptions: { orderBy: { sortOrder: "asc" } },
              deductions: true,
            },
          },
        },
      },
    },
  });

  if (!sheet || sheet.status !== "DRAFT") return false;

  const template = await prisma.eventJudgingTemplate.findFirst({
    where: { id: sheet.eventJudgingTemplateId, eventId: sheet.eventId },
    include: {
      sections: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            include: {
              deductionOptions: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!template) return false;

  if (isScoreSheetSyncedWithTemplate(sheet, template)) {
    return false;
  }

  const matchedSheetSectionIds = new Set<string>();

  await prisma.$transaction(async (tx) => {
    await tx.judgeScoreSheet.update({
      where: { id: sheetId },
      data: {
        methodology: template.methodology,
        totalPoints: template.totalPoints,
      },
    });

    for (const templateSection of template.sections) {
      let sheetSection = findSheetSectionForTemplate(
        templateSection,
        sheet.sections,
      );

      if (!sheetSection) {
        sheetSection = await tx.judgeScoreSheetSection.create({
          data: {
            scoreSheetId: sheetId,
            eventJudgingSectionId: templateSection.id,
            name: templateSection.name,
            sortOrder: templateSection.sortOrder,
            weightPercent: templateSection.weightPercent,
            maxSectionPoints: templateSection.maxSectionPoints,
            judgeGuidance: templateSection.judgeGuidance,
            isActive: true,
            items: {
              create: templateSection.items.map((item) => ({
                label: item.label,
                sortOrder: item.sortOrder,
                maxPoints: item.maxPoints,
                isIndented: item.isIndented,
                pointType: item.pointType,
                scoringType: item.scoringType,
                allowMultipleViolations: item.allowMultipleViolations,
                judgeGuidance: item.judgeGuidance,
                requiresCommentOnDeduction: item.requiresCommentOnDeduction,
                isActive: true,
                deductionOptions: {
                  create: item.deductionOptions.map((opt) => ({
                    label: opt.label,
                    pointsDeducted: opt.pointsDeducted,
                    sortOrder: opt.sortOrder,
                    deductionBucket: opt.deductionBucket,
                  })),
                },
              })),
            },
          },
          include: {
            items: {
              include: {
                deductionOptions: true,
                deductions: true,
              },
            },
          },
        });
        sheet.sections.push(sheetSection);
        matchedSheetSectionIds.add(sheetSection.id);
        continue;
      }

      matchedSheetSectionIds.add(sheetSection.id);

      if (!sectionMetadataMatches(sheetSection, templateSection)) {
        await tx.judgeScoreSheetSection.update({
          where: { id: sheetSection.id },
          data: {
            eventJudgingSectionId: templateSection.id,
            name: templateSection.name,
            sortOrder: templateSection.sortOrder,
            weightPercent: templateSection.weightPercent,
            maxSectionPoints: templateSection.maxSectionPoints,
            judgeGuidance: templateSection.judgeGuidance,
            isActive: true,
          },
        });
      }

      const matchedSheetItemIds = new Set<string>();

      for (const templateItem of templateSection.items) {
        const sheetItem = findSheetItemForTemplate(
          templateItem,
          sheetSection.items,
        );

        if (!sheetItem) {
          await tx.judgeScoreSheetItem.create({
            data: {
              sectionId: sheetSection.id,
              label: templateItem.label,
              sortOrder: templateItem.sortOrder,
              maxPoints: templateItem.maxPoints,
              isIndented: templateItem.isIndented,
              pointType: templateItem.pointType,
              scoringType: templateItem.scoringType,
              allowMultipleViolations: templateItem.allowMultipleViolations,
              judgeGuidance: templateItem.judgeGuidance,
              requiresCommentOnDeduction: templateItem.requiresCommentOnDeduction,
              isActive: true,
              deductionOptions: {
                create: templateItem.deductionOptions.map((opt) => ({
                  label: opt.label,
                  pointsDeducted: opt.pointsDeducted,
                  sortOrder: opt.sortOrder,
                  deductionBucket: opt.deductionBucket,
                })),
              },
            },
          });
          continue;
        }

        matchedSheetItemIds.add(sheetItem.id);

        if (!itemMetadataMatches(sheetItem, templateItem)) {
          await syncSheetItemFromTemplate(tx, sheetItem, templateItem);
        }
      }

      for (const sheetItem of sheetSection.items) {
        if (!matchedSheetItemIds.has(sheetItem.id) && sheetItem.isActive) {
          await tx.judgeScoreSheetItem.update({
            where: { id: sheetItem.id },
            data: { isActive: false },
          });
        }
      }
    }

    for (const sheetSection of sheet.sections) {
      if (!matchedSheetSectionIds.has(sheetSection.id) && sheetSection.isActive) {
        await tx.judgeScoreSheetSection.update({
          where: { id: sheetSection.id },
          data: { isActive: false },
        });
      }
    }
  }, TX_OPTIONS);

  return true;
}

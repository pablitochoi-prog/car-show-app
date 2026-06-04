import type { JudgingSubcategoryScoringType } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { TemplateSectionInput } from "@/lib/judging/event-judging-template-validation";
import {
  itemMatchKey,
  sectionMatchKey,
  shouldReplaceDeductionOptions,
} from "@/lib/judging/judging-structure-match";

const TX_OPTIONS = { maxWait: 15_000, timeout: 60_000 } as const;

function resolveScoringType(
  scoringType: JudgingSubcategoryScoringType | undefined,
): JudgingSubcategoryScoringType {
  if (scoringType === "FULL" || scoringType === "LEVELS" || scoringType === "DISCRETIONARY") {
    return scoringType;
  }
  return "LEVELS";
}

/**
 * Updates event template sections/items in place so scoring-type edits persist
 * without deleting the full tree (avoids timeouts and broken judge assignments).
 */
export async function syncEventJudgingTemplateStructure(
  templateId: string,
  sections: TemplateSectionInput[],
): Promise<void> {
  const existing = await prisma.eventJudgingTemplate.findUnique({
    where: { id: templateId },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
            include: {
              deductionOptions: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
  });
  if (!existing) throw new Error("Score sheet template not found.");

  const matchedSectionIds = new Set<string>();

  await prisma.$transaction(async (tx) => {
    for (const inputSection of sections) {
      const isActive = inputSection.isActive !== false;
      let dbSection = inputSection.id
        ? existing.sections.find((s) => s.id === inputSection.id)
        : undefined;
      if (!dbSection) {
        const key = sectionMatchKey({
          sortOrder: inputSection.sortOrder,
          name: inputSection.name,
        });
        dbSection = existing.sections.find((s) => sectionMatchKey(s) === key);
      }

      if (!dbSection) {
        if (!isActive) continue;
        dbSection = await tx.eventJudgingSection.create({
          data: {
            templateId,
            name: inputSection.name.trim(),
            sortOrder: inputSection.sortOrder,
            weightPercent: inputSection.weightPercent ?? null,
            maxSectionPoints: inputSection.maxSectionPoints ?? null,
            judgeGuidance: inputSection.judgeGuidance ?? null,
            isActive: true,
            items: {
              create: inputSection.items
                .filter((item) => item.isActive !== false)
                .map((item) => buildItemCreate(item)),
            },
          },
          include: {
            items: { include: { deductionOptions: true } },
          },
        });
        existing.sections.push(dbSection);
        matchedSectionIds.add(dbSection.id);
        continue;
      }

      matchedSectionIds.add(dbSection.id);

      await tx.eventJudgingSection.update({
        where: { id: dbSection.id },
        data: {
          name: inputSection.name.trim(),
          sortOrder: inputSection.sortOrder,
          weightPercent: inputSection.weightPercent ?? null,
          maxSectionPoints: inputSection.maxSectionPoints ?? null,
          judgeGuidance: inputSection.judgeGuidance ?? null,
          isActive,
        },
      });

      const matchedItemIds = new Set<string>();

      for (const inputItem of inputSection.items) {
        const itemActive = inputItem.isActive !== false;
        let dbItem = inputItem.id
          ? dbSection.items.find((i) => i.id === inputItem.id)
          : undefined;
        if (!dbItem) {
          const key = itemMatchKey({
            sortOrder: inputItem.sortOrder,
            label: inputItem.label,
          });
          dbItem = dbSection.items.find((i) => itemMatchKey(i) === key);
        }

        if (!dbItem) {
          if (!itemActive) continue;
          await tx.eventJudgingItem.create({
            data: {
              sectionId: dbSection.id,
              ...buildItemCreate(inputItem),
            },
          });
          continue;
        }

        matchedItemIds.add(dbItem.id);
        const scoringType = resolveScoringType(inputItem.scoringType);

        await tx.eventJudgingItem.update({
          where: { id: dbItem.id },
          data: {
            label: inputItem.label.trim(),
            sortOrder: inputItem.sortOrder,
            maxPoints: inputItem.maxPoints,
            isIndented: inputItem.isIndented ?? false,
            pointType: inputItem.pointType ?? null,
            scoringType,
            allowMultipleViolations:
              scoringType === "DISCRETIONARY"
                ? false
                : (inputItem.allowMultipleViolations ?? false),
            judgeGuidance: inputItem.judgeGuidance ?? null,
            requiresCommentOnDeduction: inputItem.requiresCommentOnDeduction ?? false,
            isActive: itemActive,
          },
        });

        const replaceOptions = shouldReplaceDeductionOptions(
          {
            scoringType: dbItem.scoringType,
            allowMultipleViolations: dbItem.allowMultipleViolations,
            maxPoints: dbItem.maxPoints,
            deductionOptions: dbItem.deductionOptions,
          },
          {
            scoringType,
            allowMultipleViolations: inputItem.allowMultipleViolations,
            maxPoints: inputItem.maxPoints,
            deductionOptions:
              scoringType === "DISCRETIONARY" ? [] : inputItem.deductionOptions,
          },
        );

        if (replaceOptions) {
          await tx.eventJudgingDeductionOption.deleteMany({
            where: { itemId: dbItem.id },
          });
          if (scoringType !== "DISCRETIONARY" && inputItem.deductionOptions.length > 0) {
            await tx.eventJudgingDeductionOption.createMany({
              data: inputItem.deductionOptions.map((opt) => ({
                itemId: dbItem!.id,
                label: opt.label.trim(),
                pointsDeducted: opt.pointsDeducted,
                sortOrder: opt.sortOrder,
                deductionBucket: opt.deductionBucket ?? null,
              })),
            });
          }
        }
      }

      for (const dbItem of dbSection.items) {
        if (!matchedItemIds.has(dbItem.id) && dbItem.isActive) {
          await tx.eventJudgingItem.update({
            where: { id: dbItem.id },
            data: { isActive: false },
          });
        }
      }
    }

    for (const dbSection of existing.sections) {
      if (!matchedSectionIds.has(dbSection.id) && dbSection.isActive) {
        await tx.eventJudgingSection.update({
          where: { id: dbSection.id },
          data: { isActive: false },
        });
      }
    }
  }, TX_OPTIONS);
}

function buildItemCreate(item: TemplateSectionInput["items"][number]) {
  const scoringType = resolveScoringType(item.scoringType);
  return {
    label: item.label.trim(),
    sortOrder: item.sortOrder,
    maxPoints: item.maxPoints,
    isIndented: item.isIndented ?? false,
    pointType: item.pointType ?? null,
    scoringType,
    allowMultipleViolations:
      scoringType === "DISCRETIONARY"
        ? false
        : (item.allowMultipleViolations ?? false),
    judgeGuidance: item.judgeGuidance ?? null,
    requiresCommentOnDeduction: item.requiresCommentOnDeduction ?? false,
    isActive: item.isActive !== false,
    deductionOptions: {
      create:
        scoringType === "DISCRETIONARY"
          ? []
          : item.deductionOptions.map((opt) => ({
              label: opt.label.trim(),
              pointsDeducted: opt.pointsDeducted,
              sortOrder: opt.sortOrder,
              deductionBucket: opt.deductionBucket ?? null,
            })),
    },
  };
}

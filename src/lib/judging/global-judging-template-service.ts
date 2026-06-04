import type { JudgingMethodology } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { TemplateSectionInput } from "@/lib/judging/event-judging-template-validation";
import { validateEventJudgingTemplateStructure } from "@/lib/judging/event-judging-template-validation";
import { formatScorecardValidationError } from "@/lib/judging/scorecard-template-validation";
import { validateStructurePayload } from "@/lib/judging/scorecard-template-mapper";

export const globalJudgingTemplateInclude = {
  sections: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      items: {
        orderBy: { sortOrder: "asc" as const },
        include: {
          deductionOptions: { orderBy: { sortOrder: "asc" as const } },
        },
      },
    },
  },
  _count: { select: { eventCopies: true } },
};

export const GLOBAL_TEMPLATE_EDIT_LOCK = {
  editLock: "OPEN" as const,
  draftCount: 0,
  submittedCount: 0,
  finalizedCount: 0,
  canEditStructure: true,
  canEditGuidance: true,
  showDraftWarning: false,
};

export async function loadGlobalJudgingTemplate(templateId: string) {
  const template = await prisma.judgingTemplate.findUnique({
    where: { id: templateId },
    include: globalJudgingTemplateInclude,
  });
  if (!template) return null;

  const sectionInputs = template.sections.map((s) => ({
    name: s.name,
    sortOrder: s.sortOrder,
    weightPercent: s.weightPercent,
    maxSectionPoints: s.maxSectionPoints,
    judgeGuidance: s.judgeGuidance,
    isActive: s.isActive,
    items: s.items.map((i) => ({
      label: i.label,
      sortOrder: i.sortOrder,
      maxPoints: i.maxPoints,
      isIndented: i.isIndented,
      pointType: i.pointType,
      scoringType: i.scoringType,
      allowMultipleViolations: i.allowMultipleViolations,
      judgeGuidance: i.judgeGuidance,
      requiresCommentOnDeduction: i.requiresCommentOnDeduction,
      isActive: i.isActive,
      deductionOptions: i.deductionOptions.map((d) => ({
        label: d.label,
        pointsDeducted: d.pointsDeducted,
        sortOrder: d.sortOrder,
        deductionBucket: d.deductionBucket,
      })),
    })),
  }));

  const warnings = validateEventJudgingTemplateStructure({
    totalPoints: template.totalPoints,
    sections: sectionInputs,
  });

  return {
    template,
    editLockInfo: {
      ...GLOBAL_TEMPLATE_EDIT_LOCK,
      scoreSheetCount: template._count.eventCopies,
    },
    warnings,
  };
}

export async function updateGlobalJudgingTemplateMetadata(input: {
  templateId: string;
  name?: string;
  description?: string | null;
  totalPoints?: number;
  scoringGroup?: string | null;
  vehicleType?: string | null;
  methodology?: JudgingMethodology;
}) {
  const existing = await prisma.judgingTemplate.findUnique({
    where: { id: input.templateId },
    select: { id: true },
  });
  if (!existing) throw new Error("Score sheet template not found.");

  if (
    input.methodology != null &&
    input.methodology !== "DEDUCTION" &&
    input.methodology !== "ADDITIVE" &&
    input.methodology !== "ORIGINALITY_CONDITION"
  ) {
    throw new Error("Invalid scoring method.");
  }

  return prisma.judgingTemplate.update({
    where: { id: input.templateId },
    data: {
      ...(input.name != null ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.totalPoints != null ? { totalPoints: input.totalPoints } : {}),
      ...(input.scoringGroup !== undefined
        ? { scoringGroup: input.scoringGroup?.trim() || null }
        : {}),
      ...(input.vehicleType !== undefined
        ? { vehicleType: input.vehicleType?.trim() || null }
        : {}),
      ...(input.methodology != null ? { methodology: input.methodology } : {}),
    },
    include: globalJudgingTemplateInclude,
  });
}

async function replaceGlobalTemplateStructure(
  templateId: string,
  sections: TemplateSectionInput[],
) {
  await prisma.$transaction(async (tx) => {
    const sectionIds = (
      await tx.judgingTemplateSection.findMany({
        where: { templateId },
        select: { id: true },
      })
    ).map((s) => s.id);

    if (sectionIds.length > 0) {
      const itemIds = (
        await tx.judgingTemplateItem.findMany({
          where: { sectionId: { in: sectionIds } },
          select: { id: true },
        })
      ).map((i) => i.id);

      if (itemIds.length > 0) {
        await tx.judgingTemplateDeductionOption.deleteMany({
          where: { itemId: { in: itemIds } },
        });
        await tx.judgingTemplateItem.deleteMany({ where: { id: { in: itemIds } } });
      }
      await tx.judgingTemplateSection.deleteMany({ where: { templateId } });
    }

    for (const section of sections) {
      await tx.judgingTemplateSection.create({
        data: {
          templateId,
          name: section.name.trim(),
          sortOrder: section.sortOrder,
          weightPercent: section.weightPercent ?? null,
          maxSectionPoints: section.maxSectionPoints ?? null,
          judgeGuidance: section.judgeGuidance ?? null,
          isActive: section.isActive !== false,
          items: {
            create: section.items.map((item) => ({
              label: item.label.trim(),
              sortOrder: item.sortOrder,
              maxPoints: item.maxPoints,
              isIndented: item.isIndented ?? false,
              pointType: item.pointType ?? null,
              scoringType: item.scoringType ?? "LEVELS",
              allowMultipleViolations:
                item.scoringType === "DISCRETIONARY"
                  ? false
                  : (item.allowMultipleViolations ?? false),
              judgeGuidance: item.judgeGuidance ?? null,
              requiresCommentOnDeduction: item.requiresCommentOnDeduction ?? false,
              isActive: item.isActive !== false,
              deductionOptions: {
                create: (item.scoringType === "DISCRETIONARY"
                  ? []
                  : item.deductionOptions
                ).map((opt) => ({
                  label: opt.label.trim(),
                  pointsDeducted: opt.pointsDeducted,
                  sortOrder: opt.sortOrder,
                  deductionBucket: opt.deductionBucket ?? null,
                })),
              },
            })),
          },
        },
      });
    }
  });
}

export async function updateGlobalJudgingTemplateStructure(input: {
  templateId: string;
  totalPoints?: number;
  scoringGroup?: string | null;
  vehicleType?: string | null;
  methodology?: JudgingMethodology;
  sections: TemplateSectionInput[];
}) {
  const existing = await prisma.judgingTemplate.findUnique({
    where: { id: input.templateId },
    select: { id: true, totalPoints: true, methodology: true },
  });
  if (!existing) throw new Error("Score sheet template not found.");

  const totalPoints = input.totalPoints ?? existing.totalPoints;
  const methodology = input.methodology ?? existing.methodology;

  const scorecardErrors = validateStructurePayload(
    methodology,
    totalPoints,
    input.sections,
  );
  if (scorecardErrors.length > 0) {
    throw new Error(formatScorecardValidationError(scorecardErrors[0]!));
  }

  const warnings = validateEventJudgingTemplateStructure({
    totalPoints,
    sections: input.sections,
  });

  await prisma.judgingTemplate.update({
    where: { id: input.templateId },
    data: {
      ...(input.totalPoints != null ? { totalPoints: input.totalPoints } : {}),
      ...(input.scoringGroup !== undefined
        ? { scoringGroup: input.scoringGroup?.trim() || null }
        : {}),
      ...(input.vehicleType !== undefined
        ? { vehicleType: input.vehicleType?.trim() || null }
        : {}),
      ...(input.methodology != null ? { methodology: input.methodology } : {}),
    },
  });

  await replaceGlobalTemplateStructure(input.templateId, input.sections);
  return { warnings };
}

export async function setGlobalJudgingTemplateActive(
  templateId: string,
  isActive: boolean,
) {
  const existing = await prisma.judgingTemplate.findUnique({
    where: { id: templateId },
    select: { id: true },
  });
  if (!existing) throw new Error("Score sheet template not found.");

  return prisma.judgingTemplate.update({
    where: { id: templateId },
    data: { isActive },
    include: globalJudgingTemplateInclude,
  });
}

export async function deleteGlobalJudgingTemplate(templateId: string) {
  const existing = await prisma.judgingTemplate.findUnique({
    where: { id: templateId },
    select: { id: true, name: true, _count: { select: { eventCopies: true } } },
  });
  if (!existing) throw new Error("Score sheet template not found.");

  await prisma.judgingTemplate.delete({ where: { id: templateId } });

  return {
    id: existing.id,
    name: existing.name,
    eventCopyCount: existing._count.eventCopies,
  };
}

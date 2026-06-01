import { prisma } from "@/lib/db";
import { resolveEventTemplateEditLock } from "@/lib/judging/event-judging-edit-lock";
import type {
  TemplateSectionInput,
  TemplateValidationWarning,
} from "@/lib/judging/event-judging-template-validation";
import { validateEventJudgingTemplateStructure } from "@/lib/judging/event-judging-template-validation";

export const eventJudgingTemplateInclude = {
  sourceTemplate: { select: { id: true, slug: true, name: true } },
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
  _count: { select: { scoreSheets: true, classes: true } },
};

export async function loadEventJudgingTemplate(eventId: string, templateId: string) {
  const template = await prisma.eventJudgingTemplate.findFirst({
    where: { id: templateId, eventId },
    include: eventJudgingTemplateInclude,
  });
  if (!template) return null;

  const editLockInfo = await resolveEventTemplateEditLock(templateId);
  const warnings = validateEventJudgingTemplateStructure({
    totalPoints: template.totalPoints,
    sections: template.sections.map((s) => ({
      name: s.name,
      sortOrder: s.sortOrder,
      weightPercent: s.weightPercent,
      maxSectionPoints: s.maxSectionPoints,
      judgeGuidance: s.judgeGuidance,
      items: s.items.map((i) => ({
        label: i.label,
        sortOrder: i.sortOrder,
        maxPoints: i.maxPoints,
        judgeGuidance: i.judgeGuidance,
        requiresCommentOnDeduction: i.requiresCommentOnDeduction,
        deductionOptions: i.deductionOptions.map((d) => ({
          label: d.label,
          pointsDeducted: d.pointsDeducted,
          sortOrder: d.sortOrder,
          deductionBucket: d.deductionBucket,
        })),
      })),
    })),
  });

  return { template, editLockInfo, warnings };
}

export async function updateEventJudgingTemplateMetadata(input: {
  eventId: string;
  templateId: string;
  name?: string;
  description?: string | null;
  totalPoints?: number;
}) {
  const existing = await prisma.eventJudgingTemplate.findFirst({
    where: { id: input.templateId, eventId: input.eventId },
    select: { id: true },
  });
  if (!existing) throw new Error("Score sheet template not found.");

  const lock = await resolveEventTemplateEditLock(input.templateId);
  if (input.totalPoints != null && !lock.canEditStructure) {
    throw new Error("Total points cannot be changed after score sheets are submitted.");
  }

  return prisma.eventJudgingTemplate.update({
    where: { id: input.templateId },
    data: {
      ...(input.name != null ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.totalPoints != null ? { totalPoints: input.totalPoints } : {}),
    },
    include: eventJudgingTemplateInclude,
  });
}

async function replaceTemplateStructure(
  templateId: string,
  sections: TemplateSectionInput[],
) {
  await prisma.$transaction(async (tx) => {
    const sectionIds = (
      await tx.eventJudgingSection.findMany({
        where: { templateId },
        select: { id: true },
      })
    ).map((s) => s.id);

    if (sectionIds.length > 0) {
      const itemIds = (
        await tx.eventJudgingItem.findMany({
          where: { sectionId: { in: sectionIds } },
          select: { id: true },
        })
      ).map((i) => i.id);

      if (itemIds.length > 0) {
        await tx.eventJudgingDeductionOption.deleteMany({
          where: { itemId: { in: itemIds } },
        });
        await tx.eventJudgingItem.deleteMany({ where: { id: { in: itemIds } } });
      }
      await tx.eventJudgingSection.deleteMany({ where: { templateId } });
    }

    for (const section of sections) {
      await tx.eventJudgingSection.create({
        data: {
          templateId,
          name: section.name.trim(),
          sortOrder: section.sortOrder,
          weightPercent: section.weightPercent ?? null,
          maxSectionPoints: section.maxSectionPoints ?? null,
          judgeGuidance: section.judgeGuidance ?? null,
          items: {
            create: section.items.map((item) => ({
              label: item.label.trim(),
              sortOrder: item.sortOrder,
              maxPoints: item.maxPoints,
              judgeGuidance: item.judgeGuidance ?? null,
              requiresCommentOnDeduction: item.requiresCommentOnDeduction ?? false,
              deductionOptions: {
                create: item.deductionOptions.map((opt) => ({
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

export async function updateEventJudgingTemplateStructure(input: {
  eventId: string;
  templateId: string;
  totalPoints?: number;
  sections: TemplateSectionInput[];
}): Promise<{ warnings: TemplateValidationWarning[] }> {
  const existing = await prisma.eventJudgingTemplate.findFirst({
    where: { id: input.templateId, eventId: input.eventId },
    select: { id: true, totalPoints: true },
  });
  if (!existing) throw new Error("Score sheet template not found.");

  const lock = await resolveEventTemplateEditLock(input.templateId);
  if (!lock.canEditStructure) {
    throw new Error(
      "Structural edits are locked because submitted or finalized score sheets exist.",
    );
  }

  const totalPoints = input.totalPoints ?? existing.totalPoints;
  const warnings = validateEventJudgingTemplateStructure({
    totalPoints,
    sections: input.sections,
  });

  if (input.totalPoints != null) {
    await prisma.eventJudgingTemplate.update({
      where: { id: input.templateId },
      data: { totalPoints: input.totalPoints },
    });
  }

  await replaceTemplateStructure(input.templateId, input.sections);
  return { warnings };
}

export async function updateEventJudgingTemplateGuidance(input: {
  eventId: string;
  templateId: string;
  sections: {
    id: string;
    judgeGuidance?: string | null;
    items: { id: string; judgeGuidance?: string | null }[];
  }[];
}) {
  const existing = await prisma.eventJudgingTemplate.findFirst({
    where: { id: input.templateId, eventId: input.eventId },
    select: { id: true },
  });
  if (!existing) throw new Error("Score sheet template not found.");

  const lock = await resolveEventTemplateEditLock(input.templateId);
  if (!lock.canEditGuidance) {
    throw new Error("Guidance edits are not allowed for this template.");
  }

  await prisma.$transaction(async (tx) => {
    for (const section of input.sections) {
      if (section.judgeGuidance !== undefined) {
        await tx.eventJudgingSection.updateMany({
          where: { id: section.id, templateId: input.templateId },
          data: { judgeGuidance: section.judgeGuidance },
        });
      }
      for (const item of section.items) {
        if (item.judgeGuidance !== undefined) {
          await tx.eventJudgingItem.updateMany({
            where: {
              id: item.id,
              section: { templateId: input.templateId },
            },
            data: { judgeGuidance: item.judgeGuidance },
          });
        }
      }
    }
  });
}

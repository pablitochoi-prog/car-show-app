import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ensureJudgingClassForTemplate } from "@/lib/judging/event-judging-template-setup";

type DbClient = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export type CloneJudgingTemplateInput = {
  eventId: string;
  sourceTemplateId: string;
  name?: string;
};

export type CloneJudgingTemplateResult = {
  eventTemplateId: string;
  sectionCount: number;
  itemCount: number;
};

async function cloneTemplateTree(
  db: DbClient,
  input: CloneJudgingTemplateInput,
): Promise<CloneJudgingTemplateResult> {
  const source = await db.judgingTemplate.findUnique({
    where: { id: input.sourceTemplateId },
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

  if (!source) {
    throw new Error("Judging template not found.");
  }
  if (!source.isActive) {
    throw new Error("Judging template is not active.");
  }

  const event = await db.event.findUnique({
    where: { id: input.eventId },
    select: { id: true },
  });
  if (!event) {
    throw new Error("Event not found.");
  }

  let itemCount = 0;

  const sortAgg = await db.eventJudgingTemplate.aggregate({
    where: { eventId: input.eventId },
    _max: { sortOrder: true },
  });
  const sortOrder = (sortAgg._max.sortOrder ?? -1) + 1;

  const eventTemplate = await db.eventJudgingTemplate.create({
    data: {
      eventId: input.eventId,
      sourceTemplateId: source.id,
      sortOrder,
      name: input.name?.trim() || source.name,
      description: source.description,
      scoringGroup: source.scoringGroup,
      vehicleType: source.vehicleType,
      methodology: source.methodology,
      totalPoints: source.totalPoints,
      sections: {
        create: source.sections.map((section) => ({
          name: section.name,
          sortOrder: section.sortOrder,
          weightPercent: section.weightPercent,
          maxSectionPoints: section.maxSectionPoints,
          judgeGuidance: section.judgeGuidance,
          isActive: section.isActive,
          items: {
            create: section.items.map((item) => {
              itemCount += 1;
              return {
                label: item.label,
                sortOrder: item.sortOrder,
                maxPoints: item.maxPoints,
                isIndented: item.isIndented,
                pointType: item.pointType,
                scoringType: item.scoringType,
                allowMultipleViolations: item.allowMultipleViolations,
                judgeGuidance: item.judgeGuidance,
                requiresCommentOnDeduction: item.requiresCommentOnDeduction,
                isActive: item.isActive,
                deductionOptions: {
                  create: item.deductionOptions.map((opt) => ({
                    label: opt.label,
                    pointsDeducted: opt.pointsDeducted,
                    sortOrder: opt.sortOrder,
                    deductionBucket: opt.deductionBucket,
                  })),
                },
              };
            }),
          },
        })),
      },
    },
    select: { id: true },
  });

  return {
    eventTemplateId: eventTemplate.id,
    sectionCount: source.sections.length,
    itemCount,
  };
}

/** Clone a global JudgingTemplate into an event-specific EventJudgingTemplate. */
export async function cloneJudgingTemplateToEvent(
  input: CloneJudgingTemplateInput,
): Promise<CloneJudgingTemplateResult> {
  const result = await prisma.$transaction((tx) => cloneTemplateTree(tx, input), {
    maxWait: 15_000,
    timeout: 60_000,
  });
  await ensureJudgingClassForTemplate(input.eventId, result.eventTemplateId);
  return result;
}

import { prisma } from "@/lib/db";
import {
  createEventJudgingClass,
  updateEventJudgingClass,
} from "@/lib/judging/event-judging-class-service";

export type EventTemplateListRow = {
  id: string;
  name: string;
  description: string | null;
  methodology: string;
  totalPoints: number;
  scoringGroup: string | null;
  vehicleType: string | null;
  sortOrder: number;
  editLock: string;
  judgingClassId: string | null;
  eligibleEventCategoryIds: string[];
  sourceTemplate: { id: string; slug: string; name: string } | null;
  _count: { sections: number; scoreSheets: number };
};

/** Primary judging class for a template (one row per template in the UI). */
export async function ensureJudgingClassForTemplate(
  eventId: string,
  templateId: string,
) {
  const template = await prisma.eventJudgingTemplate.findFirst({
    where: { id: templateId, eventId },
    select: { id: true, name: true, sortOrder: true },
  });
  if (!template) throw new Error("Score sheet template not found.");

  const existing = await prisma.eventJudgingClass.findFirst({
    where: { eventId, eventJudgingTemplateId: templateId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await createEventJudgingClass(eventId, {
    name: template.name,
    eventJudgingTemplateId: templateId,
    eligibleEventCategoryIds: [],
    sortOrder: template.sortOrder,
  });
  return created.id;
}

export async function syncJudgingClassNameForTemplate(
  eventId: string,
  templateId: string,
  name: string,
) {
  const classId = await ensureJudgingClassForTemplate(eventId, templateId);
  await prisma.eventJudgingClass.updateMany({
    where: { id: classId, eventId },
    data: { name: name.trim() },
  });
}

export async function setTemplateEligibleVehicleClasses(
  eventId: string,
  templateId: string,
  eligibleEventCategoryIds: string[],
) {
  const classId = await ensureJudgingClassForTemplate(eventId, templateId);
  return updateEventJudgingClass(eventId, classId, {
    eligibleEventCategoryIds,
  });
}

export async function reorderEventJudgingTemplates(
  eventId: string,
  orderedTemplateIds: string[],
) {
  const existing = await prisma.eventJudgingTemplate.findMany({
    where: { eventId },
    select: { id: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  if (existing.length !== orderedTemplateIds.length) {
    throw new Error("Reorder must include every event template.");
  }
  const idSet = new Set(existing.map((t) => t.id));
  for (const id of orderedTemplateIds) {
    if (!idSet.has(id)) {
      throw new Error("Invalid template id in reorder list.");
    }
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < orderedTemplateIds.length; i++) {
      const templateId = orderedTemplateIds[i]!;
      await tx.eventJudgingTemplate.update({
        where: { id: templateId },
        data: { sortOrder: i },
      });
      await tx.eventJudgingClass.updateMany({
        where: { eventId, eventJudgingTemplateId: templateId },
        data: { sortOrder: i },
      });
    }
  });
}

export async function listEventJudgingTemplatesForOrganizer(
  eventId: string,
): Promise<EventTemplateListRow[]> {
  const templates = await prisma.eventJudgingTemplate.findMany({
    where: { eventId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      sourceTemplate: { select: { id: true, slug: true, name: true } },
      _count: { select: { sections: true, scoreSheets: true } },
      classes: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        take: 1,
        select: {
          id: true,
          eligibleCategories: { select: { eventCategoryId: true } },
        },
      },
    },
  });

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    methodology: t.methodology,
    totalPoints: t.totalPoints,
    scoringGroup: t.scoringGroup,
    vehicleType: t.vehicleType,
    sortOrder: t.sortOrder,
    editLock: t.editLock,
    judgingClassId: t.classes[0]?.id ?? null,
    eligibleEventCategoryIds:
      t.classes[0]?.eligibleCategories.map((c) => c.eventCategoryId) ?? [],
    sourceTemplate: t.sourceTemplate,
    _count: t._count,
  }));
}

export async function nextEventTemplateSortOrder(eventId: string): Promise<number> {
  const max = await prisma.eventJudgingTemplate.aggregate({
    where: { eventId },
    _max: { sortOrder: true },
  });
  return (max._max.sortOrder ?? -1) + 1;
}

/** Remove an event score sheet template and cascaded classes, sheets, and assignments. */
export async function deleteEventJudgingTemplate(
  eventId: string,
  templateId: string,
): Promise<{ deletedScoreSheetCount: number }> {
  const template = await prisma.eventJudgingTemplate.findFirst({
    where: { id: templateId, eventId },
    select: {
      id: true,
      _count: { select: { scoreSheets: true } },
    },
  });
  if (!template) {
    throw new Error("Score sheet template not found.");
  }

  const deletedScoreSheetCount = template._count.scoreSheets;
  await prisma.eventJudgingTemplate.delete({ where: { id: templateId } });
  return { deletedScoreSheetCount };
}

import { prisma } from "@/lib/db";

export type EventJudgingClassInput = {
  name: string;
  description?: string | null;
  eventJudgingTemplateId: string;
  eligibleEventCategoryIds: string[];
  isActive?: boolean;
  sortOrder?: number;
};

export const eventJudgingClassInclude = {
  template: { select: { id: true, name: true, totalPoints: true } },
  eligibleCategories: {
    select: {
      id: true,
      eventCategoryId: true,
      eventCategory: {
        select: {
          id: true,
          customName: true,
          category: { select: { name: true } },
        },
      },
    },
  },
  _count: { select: { scoreSheets: true } },
};

function categoryLabel(ec: {
  customName: string | null;
  category: { name: string } | null;
}): string {
  return ec.customName?.trim() || ec.category?.name || "Vehicle Class";
}

export function formatEventJudgingClass(row: {
  id: string;
  name: string;
  description: string | null;
  eventJudgingTemplateId: string;
  isActive: boolean;
  sortOrder: number;
  template: { id: string; name: string; totalPoints: number };
  eligibleCategories: {
    eventCategoryId: string;
    eventCategory: {
      customName: string | null;
      category: { name: string } | null;
    };
  }[];
  _count: { scoreSheets: number };
}) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    eventJudgingTemplateId: row.eventJudgingTemplateId,
    templateName: row.template.name,
    templateTotalPoints: row.template.totalPoints,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    scoreSheetCount: row._count.scoreSheets,
    eligibleEventCategoryIds: row.eligibleCategories.map((c) => c.eventCategoryId),
    eligibleVehicleClasses: row.eligibleCategories.map((c) => ({
      id: c.eventCategoryId,
      label: categoryLabel(c.eventCategory),
    })),
  };
}

async function assertEligibleCategoriesAvailable(
  eventId: string,
  categoryIds: string[],
  excludeClassId?: string,
) {
  if (categoryIds.length === 0) return;

  const valid = await prisma.eventCategory.findMany({
    where: { eventId, id: { in: categoryIds } },
    select: { id: true },
  });
  if (valid.length !== categoryIds.length) {
    throw new Error("One or more vehicle classes are invalid for this event.");
  }

  const taken = await prisma.eventJudgingClassEligibleCategory.findMany({
    where: {
      eventCategoryId: { in: categoryIds },
      ...(excludeClassId
        ? { eventJudgingClassId: { not: excludeClassId } }
        : {}),
    },
    select: { eventCategoryId: true },
  });
  if (taken.length > 0) {
    throw new Error(
      "Each vehicle class can belong to only one judging class per event.",
    );
  }
}

async function assertTemplateBelongsToEvent(
  eventId: string,
  templateId: string,
) {
  const template = await prisma.eventJudgingTemplate.findFirst({
    where: { id: templateId, eventId },
    select: { id: true },
  });
  if (!template) {
    throw new Error("Score sheet template not found for this event.");
  }
}

export async function listEventJudgingClasses(eventId: string) {
  const rows = await prisma.eventJudgingClass.findMany({
    where: { eventId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: eventJudgingClassInclude,
  });
  return rows.map(formatEventJudgingClass);
}

export async function createEventJudgingClass(
  eventId: string,
  input: EventJudgingClassInput,
) {
  const name = input.name.trim();
  if (!name) throw new Error("Judging class name is required.");

  await assertTemplateBelongsToEvent(eventId, input.eventJudgingTemplateId);
  await assertEligibleCategoriesAvailable(eventId, input.eligibleEventCategoryIds);

  const row = await prisma.eventJudgingClass.create({
    data: {
      eventId,
      name,
      description: input.description ?? null,
      eventJudgingTemplateId: input.eventJudgingTemplateId,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
      eligibleCategories: {
        create: input.eligibleEventCategoryIds.map((eventCategoryId) => ({
          eventCategoryId,
        })),
      },
    },
    include: eventJudgingClassInclude,
  });

  return formatEventJudgingClass(row);
}

export async function updateEventJudgingClass(
  eventId: string,
  classId: string,
  input: Partial<EventJudgingClassInput>,
) {
  const existing = await prisma.eventJudgingClass.findFirst({
    where: { id: classId, eventId },
    select: { id: true },
  });
  if (!existing) throw new Error("Judging class not found.");

  if (input.eventJudgingTemplateId) {
    await assertTemplateBelongsToEvent(eventId, input.eventJudgingTemplateId);
  }
  if (input.eligibleEventCategoryIds) {
    await assertEligibleCategoriesAvailable(
      eventId,
      input.eligibleEventCategoryIds,
      classId,
    );
  }

  const row = await prisma.$transaction(async (tx) => {
    if (input.eligibleEventCategoryIds) {
      await tx.eventJudgingClassEligibleCategory.deleteMany({
        where: { eventJudgingClassId: classId },
      });
      if (input.eligibleEventCategoryIds.length > 0) {
        await tx.eventJudgingClassEligibleCategory.createMany({
          data: input.eligibleEventCategoryIds.map((eventCategoryId) => ({
            eventJudgingClassId: classId,
            eventCategoryId,
          })),
        });
      }
    }

    return tx.eventJudgingClass.update({
      where: { id: classId },
      data: {
        ...(input.name != null ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.eventJudgingTemplateId != null
          ? { eventJudgingTemplateId: input.eventJudgingTemplateId }
          : {}),
        ...(input.isActive != null ? { isActive: input.isActive } : {}),
        ...(input.sortOrder != null ? { sortOrder: input.sortOrder } : {}),
      },
      include: eventJudgingClassInclude,
    });
  });

  return formatEventJudgingClass(row);
}

export async function deleteEventJudgingClass(eventId: string, classId: string) {
  const existing = await prisma.eventJudgingClass.findFirst({
    where: { id: classId, eventId },
    include: { _count: { select: { scoreSheets: true } } },
  });
  if (!existing) throw new Error("Judging class not found.");
  if (existing._count.scoreSheets > 0) {
    throw new Error(
      "Cannot delete a judging class that has score sheets. Deactivate it instead.",
    );
  }

  await prisma.eventJudgingClass.delete({ where: { id: classId } });
}

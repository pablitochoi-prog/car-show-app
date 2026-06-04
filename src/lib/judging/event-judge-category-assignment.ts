import type { EventJudgeCategoryAssignmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { listEventJudgeUserIds } from "@/lib/judging/judge-ballot-allocation";
import { findOrCreateJudgeScoreSheet } from "@/lib/judging/snapshot-score-sheet";

export class EventJudgeAssignmentError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "EventJudgeAssignmentError";
    this.code = code;
  }
}

export type EventJudgeOption = {
  userId: string;
  name: string;
  email: string;
};

export type EventScorecardCategoryOption = {
  sectionId: string;
  name: string;
  sortOrder: number;
  maxSectionPoints: number | null;
};

export type VehicleAssignmentRow = {
  registrationVehicleId: string;
  vehicleEntryCode: string;
  registrationId: string;
  eventCategoryId: string | null;
  eventCategoryName: string | null;
  nickname: string | null;
  year: number;
  make: string;
  model: string;
  assignments: Array<{
    sectionId: string;
    sectionName: string;
    judgeUserId: string;
    judgeName: string;
    status: EventJudgeCategoryAssignmentStatus;
  }>;
};

export type AssignmentConflict = {
  registrationVehicleId: string;
  vehicleEntryCode: string;
  sectionId: string;
  sectionName: string;
  currentJudgeUserId: string;
  currentJudgeName: string;
};

type ResolvedVehicle = {
  registrationVehicleId: string;
  vehicleEntryCode: string;
  registrationId: string;
  eventCategoryId: string | null;
  judgingClassId: string | null;
  eventJudgingTemplateId: string;
};

/**
 * Event scorecard template from selected categories (Exterior, Interior, etc.).
 * Vehicle class is not used—every vehicle on the show uses the same template categories.
 */
async function resolveScorecardForAssignment(
  eventId: string,
  eventJudgingSectionIds: string[],
): Promise<{ templateId: string; judgingClassId: string | null }> {
  if (eventJudgingSectionIds.length === 0) {
    throw new EventJudgeAssignmentError(
      "NO_CATEGORIES",
      "Select a scorecard category.",
    );
  }

  const sections = await prisma.eventJudgingSection.findMany({
    where: { id: { in: eventJudgingSectionIds }, isActive: true },
    select: {
      id: true,
      templateId: true,
      template: { select: { eventId: true, name: true } },
    },
  });

  if (sections.length !== eventJudgingSectionIds.length) {
    throw new EventJudgeAssignmentError(
      "INVALID_CATEGORIES",
      "One or more scorecard categories are invalid or inactive.",
    );
  }

  for (const section of sections) {
    if (section.template.eventId !== eventId) {
      throw new EventJudgeAssignmentError(
        "INVALID_CATEGORIES",
        "One or more categories do not belong to this event scorecard.",
      );
    }
  }

  const templateIds = [...new Set(sections.map((s) => s.templateId))];
  if (templateIds.length !== 1) {
    throw new EventJudgeAssignmentError(
      "INVALID_CATEGORIES",
      "Selected categories must belong to the same event scorecard template.",
    );
  }

  const templateId = templateIds[0]!;
  const judgingClass = await prisma.eventJudgingClass.findFirst({
    where: { eventId, eventJudgingTemplateId: templateId, isActive: true },
    select: { id: true },
    orderBy: [{ sortOrder: "asc" }],
  });

  return { templateId, judgingClassId: judgingClass?.id ?? null };
}

export async function listEventAssigneeJudges(eventId: string): Promise<EventJudgeOption[]> {
  const judgeIds = await listEventJudgeUserIds(eventId);
  if (judgeIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: judgeIds }, status: "ACTIVE" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  return users.map((u) => ({
    userId: u.id,
    name: u.name,
    email: u.email,
  }));
}

/** Registration vehicle classes for the assign-judges UI (all event categories). */
export async function listAssignmentVehicleClasses(eventId: string) {
  const rows = await prisma.eventCategory.findMany({
    where: { eventId },
    select: {
      id: true,
      customName: true,
      category: { select: { name: true, sortOrder: true } },
    },
    orderBy: [{ createdAt: "asc" }],
  });
  return rows
    .map((c) => ({
      id: c.id,
      name: c.customName?.trim() || c.category?.name || "Vehicle class",
      sortOrder: c.category?.sortOrder ?? 0,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

/** Scorecard categories for the template linked to this vehicle class. */
export async function listEventScorecardCategoriesForVehicleClass(
  eventId: string,
  eventCategoryId: string,
): Promise<EventScorecardCategoriesPayload> {
  const judgingClass = await prisma.eventJudgingClass.findFirst({
    where: {
      eventId,
      isActive: true,
      eligibleCategories: { some: { eventCategoryId } },
    },
    select: {
      id: true,
      name: true,
      eventJudgingTemplateId: true,
      template: {
        select: {
          id: true,
          name: true,
          sections: {
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: {
              id: true,
              name: true,
              sortOrder: true,
              maxSectionPoints: true,
            },
          },
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  if (!judgingClass) {
    return {
      judgingClassId: null,
      judgingClassName: "Unassigned",
      templateId: null,
      templateName: "No score sheet for this vehicle class",
      categories: [],
    };
  }

  return {
    judgingClassId: judgingClass.id,
    judgingClassName: judgingClass.name,
    templateId: judgingClass.template.id,
    templateName: judgingClass.template.name,
    categories: judgingClass.template.sections.map((s) => ({
      sectionId: s.id,
      name: s.name,
      sortOrder: s.sortOrder,
      maxSectionPoints: s.maxSectionPoints,
    })),
  };
}

export type EventScorecardCategoriesPayload = {
  judgingClassId: string | null;
  judgingClassName: string;
  templateId: string | null;
  templateName: string;
  categories: EventScorecardCategoryOption[];
};

/** All active scorecard categories for the event (for vehicle registrations grid assign). */
export async function listEventScorecardCategoriesForEvent(
  eventId: string,
): Promise<EventScorecardCategoriesPayload> {
  const [judgingClasses, eventTemplates] = await Promise.all([
    prisma.eventJudgingClass.findMany({
      where: { eventId, isActive: true },
      select: { eventJudgingTemplateId: true },
    }),
    prisma.eventJudgingTemplate.findMany({
      where: { eventId },
      select: { id: true, name: true },
    }),
  ]);

  const templateIds = [
    ...new Set([
      ...judgingClasses.map((j) => j.eventJudgingTemplateId),
      ...eventTemplates.map((t) => t.id),
    ]),
  ];

  if (templateIds.length === 0) {
    return {
      judgingClassId: null,
      judgingClassName: "Event",
      templateId: null,
      templateName: "No scorecard template",
      categories: [],
    };
  }

  const sections = await prisma.eventJudgingSection.findMany({
    where: { templateId: { in: templateIds }, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      sortOrder: true,
      maxSectionPoints: true,
    },
  });

  const seen = new Set<string>();
  const categories: EventScorecardCategoryOption[] = [];
  for (const s of sections) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    categories.push({
      sectionId: s.id,
      name: s.name,
      sortOrder: s.sortOrder,
      maxSectionPoints: s.maxSectionPoints,
    });
  }

  const names = eventTemplates
    .filter((t) => templateIds.includes(t.id))
    .map((t) => t.name);
  const templateName =
    names.length === 1 ? names[0]! : `${names.length} scorecard templates`;

  return {
    judgingClassId: null,
    judgingClassName: "All vehicle classes",
    templateId: templateIds.length === 1 ? templateIds[0]! : null,
    templateName,
    categories,
  };
}

/** Categories for the scorecard template shared by the selected vehicles. */
export async function listScorecardCategoriesForSelectedVehicles(
  eventId: string,
  _registrationVehicleIds: string[],
): Promise<EventScorecardCategoriesPayload> {
  return listEventScorecardCategoriesForEvent(eventId);
}

export async function listVehiclesForAssignment(
  eventId: string,
  eventCategoryId: string | null,
): Promise<VehicleAssignmentRow[]> {
  const vehicles = await prisma.registrationVehicle.findMany({
    where: {
      registration: { eventId, status: "CONFIRMED" },
      publicVehicleId: { not: null },
      ...(eventCategoryId ? { eventCategoryId } : {}),
    },
    select: {
      id: true,
      registrationId: true,
      publicVehicleId: true,
      eventCategoryId: true,
      vehicleNickname: true,
      eventCategory: {
        select: {
          customName: true,
          category: { select: { name: true } },
        },
      },
      vehicle: { select: { nickname: true, year: true, make: true, model: true } },
    },
    orderBy: [{ publicVehicleId: "asc" }],
  });

  const vehicleIds = vehicles.map((v) => v.id);
  const assignments =
    vehicleIds.length === 0
      ? []
      : await prisma.eventJudgeCategoryAssignment.findMany({
          where: { eventId, registrationVehicleId: { in: vehicleIds } },
          include: {
            section: { select: { id: true, name: true } },
            judge: { select: { id: true, name: true } },
          },
        });

  const byVehicle = new Map<string, VehicleAssignmentRow["assignments"]>();
  for (const a of assignments) {
    const list = byVehicle.get(a.registrationVehicleId) ?? [];
    list.push({
      sectionId: a.section.id,
      sectionName: a.section.name,
      judgeUserId: a.judge.id,
      judgeName: a.judge.name,
      status: a.status,
    });
    byVehicle.set(a.registrationVehicleId, list);
  }

  return vehicles.map((v) => ({
    registrationVehicleId: v.id,
    vehicleEntryCode: v.publicVehicleId ?? "",
    registrationId: v.registrationId,
    eventCategoryId: v.eventCategoryId,
    eventCategoryName:
      v.eventCategory?.customName?.trim() ||
      v.eventCategory?.category?.name ||
      null,
    nickname: v.vehicleNickname ?? v.vehicle.nickname ?? null,
    year: v.vehicle.year,
    make: v.vehicle.make,
    model: v.vehicle.model,
    assignments: byVehicle.get(v.id) ?? [],
  }));
}

async function resolveJudgingClassForVehicleCategory(
  eventId: string,
  eventCategoryId: string | null,
  templateId: string,
): Promise<string | null> {
  if (!eventCategoryId) {
    throw new EventJudgeAssignmentError(
      "MISSING_VEHICLE_CLASS",
      "Vehicle is missing a registration class.",
    );
  }

  const judgingClass = await prisma.eventJudgingClass.findFirst({
    where: {
      eventId,
      isActive: true,
      eventJudgingTemplateId: templateId,
      eligibleCategories: { some: { eventCategoryId } },
    },
    select: { id: true },
    orderBy: [{ sortOrder: "asc" }],
  });

  return judgingClass?.id ?? null;
}

async function resolveVehiclesForAssign(
  eventId: string,
  registrationVehicleIds: string[],
  eventJudgingSectionIds: string[] = [],
): Promise<ResolvedVehicle[]> {
  if (registrationVehicleIds.length === 0) {
    throw new EventJudgeAssignmentError(
      "NO_VEHICLES",
      "Select at least one vehicle.",
    );
  }

  const rows = await prisma.registrationVehicle.findMany({
    where: {
      id: { in: registrationVehicleIds },
      registration: { eventId },
      publicVehicleId: { not: null },
    },
    select: {
      id: true,
      publicVehicleId: true,
      registrationId: true,
      eventCategoryId: true,
    },
  });

  if (rows.length !== registrationVehicleIds.length) {
    throw new EventJudgeAssignmentError(
      "INVALID_VEHICLES",
      "One or more vehicles do not belong to this event.",
    );
  }

  const { templateId } = await resolveScorecardForAssignment(
    eventId,
    eventJudgingSectionIds,
  );

  const resolved: ResolvedVehicle[] = [];
  for (const row of rows) {
    if (!row.publicVehicleId) {
      throw new EventJudgeAssignmentError(
        "MISSING_ENTRY_CODE",
        "All selected vehicles need a public entry code.",
      );
    }

    const judgingClassId = await resolveJudgingClassForVehicleCategory(
      eventId,
      row.eventCategoryId,
      templateId,
    );
    if (!judgingClassId) {
      throw new EventJudgeAssignmentError(
        "MISSING_VEHICLE_CLASS",
        "One or more vehicles use a class that is not linked to this scorecard category’s template. Map the class under Awards & Judging → Score Sheet Templates.",
      );
    }

    resolved.push({
      registrationVehicleId: row.id,
      vehicleEntryCode: row.publicVehicleId,
      registrationId: row.registrationId,
      eventCategoryId: row.eventCategoryId,
      judgingClassId,
      eventJudgingTemplateId: templateId,
    });
  }

  return resolved;
}

async function assertJudgeOnEvent(eventId: string, judgeUserId: string) {
  const judgeIds = await listEventJudgeUserIds(eventId);
  if (!judgeIds.includes(judgeUserId)) {
    throw new EventJudgeAssignmentError(
      "NOT_A_JUDGE",
      "Selected user is not assigned as a judge for this event.",
    );
  }
}

async function assertSectionsForTemplate(
  templateId: string,
  sectionIds: string[],
) {
  if (sectionIds.length === 0) {
    throw new EventJudgeAssignmentError(
      "NO_CATEGORIES",
      "Select at least one scorecard category.",
    );
  }

  const sections = await prisma.eventJudgingSection.findMany({
    where: {
      id: { in: sectionIds },
      templateId,
      isActive: true,
    },
    select: { id: true, name: true },
  });

  if (sections.length !== sectionIds.length) {
    throw new EventJudgeAssignmentError(
      "INVALID_CATEGORIES",
      "One or more categories are invalid or inactive for this event template.",
    );
  }

  return sections;
}

export async function previewJudgeCategoryAssignmentConflicts(input: {
  eventId: string;
  judgeUserId: string;
  registrationVehicleIds: string[];
  eventJudgingSectionIds: string[];
}): Promise<AssignmentConflict[]> {
  await assertJudgeOnEvent(input.eventId, input.judgeUserId);
  const vehicles = await resolveVehiclesForAssign(
    input.eventId,
    input.registrationVehicleIds,
    input.eventJudgingSectionIds,
  );
  const templateId = vehicles[0]!.eventJudgingTemplateId;
  const sections = await assertSectionsForTemplate(
    templateId,
    input.eventJudgingSectionIds,
  );
  const sectionNameById = new Map(sections.map((s) => [s.id, s.name]));

  const existing = await prisma.eventJudgeCategoryAssignment.findMany({
    where: {
      eventId: input.eventId,
      registrationVehicleId: { in: vehicles.map((v) => v.registrationVehicleId) },
      eventJudgingSectionId: { in: input.eventJudgingSectionIds },
      judgeUserId: { not: input.judgeUserId },
    },
    include: { judge: { select: { id: true, name: true } } },
  });

  const vehicleById = new Map(vehicles.map((v) => [v.registrationVehicleId, v]));

  return existing.map((row) => {
    const vehicle = vehicleById.get(row.registrationVehicleId)!;
    return {
      registrationVehicleId: row.registrationVehicleId,
      vehicleEntryCode: vehicle.vehicleEntryCode,
      sectionId: row.eventJudgingSectionId,
      sectionName: sectionNameById.get(row.eventJudgingSectionId) ?? "Category",
      currentJudgeUserId: row.judgeUserId,
      currentJudgeName: row.judge.name,
    };
  });
}

export type AssignJudgeCategoriesResult = {
  judgeName: string;
  vehicleCount: number;
  categoryCount: number;
  assignmentsCreated: number;
  assignmentsUpdated: number;
  scoreSheetsEnsured: number;
};

export async function assignJudgeToVehicleCategories(input: {
  eventId: string;
  assignedByUserId: string;
  judgeUserId: string;
  registrationVehicleIds: string[];
  eventJudgingSectionIds: string[];
  replaceExisting: boolean;
}): Promise<AssignJudgeCategoriesResult> {
  await assertJudgeOnEvent(input.eventId, input.judgeUserId);

  const judge = await prisma.user.findUnique({
    where: { id: input.judgeUserId },
    select: { name: true },
  });
  if (!judge) {
    throw new EventJudgeAssignmentError("NOT_A_JUDGE", "Judge user not found.");
  }

  const vehicles = await resolveVehiclesForAssign(
    input.eventId,
    input.registrationVehicleIds,
    input.eventJudgingSectionIds,
  );
  const templateId = vehicles[0]!.eventJudgingTemplateId;
  await assertSectionsForTemplate(templateId, input.eventJudgingSectionIds);

  const conflicts = await previewJudgeCategoryAssignmentConflicts({
    eventId: input.eventId,
    judgeUserId: input.judgeUserId,
    registrationVehicleIds: input.registrationVehicleIds,
    eventJudgingSectionIds: input.eventJudgingSectionIds,
  });
  if (conflicts.length > 0 && !input.replaceExisting) {
    throw new EventJudgeAssignmentError(
      "CONFLICTS",
      `${conflicts.length} existing assignment(s) would be replaced. Confirm reassignment to continue.`,
    );
  }

  let assignmentsCreated = 0;
  let assignmentsUpdated = 0;
  const scoreSheetsEnsured = new Set<string>();

  for (const vehicle of vehicles) {
    const { scoreSheet } = await findOrCreateJudgeScoreSheet({
      eventId: input.eventId,
      eventJudgingTemplateId: vehicle.eventJudgingTemplateId,
      eventJudgingClassId: vehicle.judgingClassId,
      vehicleEntryCode: vehicle.vehicleEntryCode,
      registrationId: vehicle.registrationId,
      registrationVehicleId: vehicle.registrationVehicleId,
      judgeUserId: input.judgeUserId,
    });
    scoreSheetsEnsured.add(scoreSheet.id);

    for (const sectionId of input.eventJudgingSectionIds) {
      const existing = await prisma.eventJudgeCategoryAssignment.findUnique({
        where: {
          eventId_registrationVehicleId_eventJudgingSectionId: {
            eventId: input.eventId,
            registrationVehicleId: vehicle.registrationVehicleId,
            eventJudgingSectionId: sectionId,
          },
        },
      });

      if (existing) {
        if (
          existing.judgeUserId === input.judgeUserId &&
          existing.judgeScoreSheetId === scoreSheet.id
        ) {
          continue;
        }
        await prisma.eventJudgeCategoryAssignment.update({
          where: { id: existing.id },
          data: {
            judgeUserId: input.judgeUserId,
            eventJudgingTemplateId: vehicle.eventJudgingTemplateId,
            eventJudgingClassId: vehicle.judgingClassId,
            vehicleEntryCode: vehicle.vehicleEntryCode,
            judgeScoreSheetId: scoreSheet.id,
            status: "NOT_JUDGED",
            assignedByUserId: input.assignedByUserId,
            reassignedFromJudgeUserId:
              existing.judgeUserId !== input.judgeUserId
                ? existing.judgeUserId
                : existing.reassignedFromJudgeUserId,
          },
        });
        assignmentsUpdated += 1;
      } else {
        await prisma.eventJudgeCategoryAssignment.create({
          data: {
            eventId: input.eventId,
            eventJudgingTemplateId: vehicle.eventJudgingTemplateId,
            eventJudgingClassId: vehicle.judgingClassId,
            registrationVehicleId: vehicle.registrationVehicleId,
            vehicleEntryCode: vehicle.vehicleEntryCode,
            judgeUserId: input.judgeUserId,
            eventJudgingSectionId: sectionId,
            status: "NOT_JUDGED",
            judgeScoreSheetId: scoreSheet.id,
            assignedByUserId: input.assignedByUserId,
          },
        });
        assignmentsCreated += 1;
      }
    }
  }

  return {
    judgeName: judge.name,
    vehicleCount: vehicles.length,
    categoryCount: input.eventJudgingSectionIds.length,
    assignmentsCreated,
    assignmentsUpdated,
    scoreSheetsEnsured: scoreSheetsEnsured.size,
  };
}

export async function assertEventHasScorecardTemplate(eventId: string) {
  const template = await prisma.eventJudgingTemplate.findFirst({
    where: { eventId },
    select: { id: true },
  });
  if (!template) {
    throw new EventJudgeAssignmentError(
      "NO_TEMPLATE",
      "Create an event scorecard template before assigning judges.",
    );
  }
  return template.id;
}

import type { EventJudgeCategoryAssignmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { resolveRegistrationContact } from "@/lib/registration-contact";
function vehicleClassLabel(
  ec: {
    customName: string | null;
    category: { name: string } | null;
  } | null,
): string {
  if (!ec) return "Class — to be assigned";
  return ec.customName?.trim() || ec.category?.name || "Vehicle class";
}
import {
  assertJudgeForEvent,
  JudgeScoreSheetAccessError,
} from "@/lib/judging/judge-score-sheet-judge-data";
import { calculateScorecardFromSheet } from "@/lib/judging/build-scorecard-from-sheet";
const STATUS_SORT: Record<EventJudgeCategoryAssignmentStatus, number> = {
  NOT_JUDGED: 0,
  SAVED_FOR_LATER: 1,
  SUBMITTED: 2,
};

export function aggregateAssignmentStatus(
  statuses: EventJudgeCategoryAssignmentStatus[],
): EventJudgeCategoryAssignmentStatus {
  if (statuses.some((s) => s === "NOT_JUDGED")) return "NOT_JUDGED";
  if (statuses.some((s) => s === "SAVED_FOR_LATER")) return "SAVED_FOR_LATER";
  return "SUBMITTED";
}

export type JudgeAssignedVehicleRow = {
  registrationVehicleId: string;
  vehicleEntryCode: string;
  sheetId: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  vin: string | null;
  nickname: string | null;
  vehicleStory: string | null;
  photoUrl: string | null;
  ownerName: string | null;
  vehicleClass: string;
  judgingClassName: string;
  assignmentStatus: EventJudgeCategoryAssignmentStatus;
  assignedCategories: Array<{
    sectionId: string;
    sectionName: string;
    status: EventJudgeCategoryAssignmentStatus;
  }>;
  sheetStatus: "DRAFT" | "SUBMITTED" | "FINALIZED";
  finalScore: number | null;
};

export async function loadJudgeAssignedScoreSummary(
  judgeUserId: string,
  eventId: string,
): Promise<{ assignmentCount: number; pendingCount: number }> {
  const rows = await prisma.eventJudgeCategoryAssignment.findMany({
    where: { eventId, judgeUserId },
    select: { status: true, registrationVehicleId: true },
  });
  const byVehicle = new Map<string, EventJudgeCategoryAssignmentStatus[]>();
  for (const row of rows) {
    const list = byVehicle.get(row.registrationVehicleId) ?? [];
    list.push(row.status);
    byVehicle.set(row.registrationVehicleId, list);
  }
  let pendingCount = 0;
  for (const statuses of byVehicle.values()) {
    const agg = aggregateAssignmentStatus(statuses);
    if (agg !== "SUBMITTED") pendingCount += 1;
  }
  return { assignmentCount: byVehicle.size, pendingCount };
}

export async function listJudgeAssignedVehicles(
  judgeUserId: string,
  eventId: string,
): Promise<{ eventName: string; vehicles: JudgeAssignedVehicleRow[] }> {
  await assertJudgeForEvent(judgeUserId, eventId);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { name: true },
  });
  if (!event) {
    throw new JudgeScoreSheetAccessError("NOT_FOUND", "Event not found.");
  }

  const assignments = await prisma.eventJudgeCategoryAssignment.findMany({
    where: { eventId, judgeUserId },
    include: {
      section: { select: { id: true, name: true } },
      eventJudgingClass: { select: { id: true, name: true } },
      registrationVehicle: {
        include: {
          vehicle: {
            select: {
              year: true,
              make: true,
              model: true,
              trim: true,
              vin: true,
              nickname: true,
              photoUrl: true,
            },
          },
          eventCategory: {
            select: {
              customName: true,
              category: { select: { name: true } },
            },
          },
          registration: {
            select: {
              id: true,
              guestFirstName: true,
              guestLastName: true,
              guestEmail: true,
              guestPhone: true,
              registrantFirstName: true,
              registrantLastName: true,
              registrantEmail: true,
              registrantPhone: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  name: true,
                  email: true,
                  phone: true,
                  status: true,
                },
              },
            },
          },
        },
      },
      judgeScoreSheet: {
        select: {
          id: true,
          status: true,
          finalScore: true,
          vehicleEntryCode: true,
        },
      },
    },
    orderBy: [{ vehicleEntryCode: "asc" }],
  });

  if (assignments.length === 0) {
    return { eventName: event.name, vehicles: [] };
  }

  const byVehicle = new Map<
    string,
    {
      assignment: (typeof assignments)[0];
      categories: JudgeAssignedVehicleRow["assignedCategories"];
      statuses: EventJudgeCategoryAssignmentStatus[];
    }
  >();

  for (const row of assignments) {
    const key = row.registrationVehicleId;
    let group = byVehicle.get(key);
    if (!group) {
      group = {
        assignment: row,
        categories: [],
        statuses: [],
      };
      byVehicle.set(key, group);
    }
    group.categories.push({
      sectionId: row.section.id,
      sectionName: row.section.name,
      status: row.status,
    });
    group.statuses.push(row.status);
  }

  const vehicles: JudgeAssignedVehicleRow[] = [];

  for (const [, group] of byVehicle) {
    const a = group.assignment;
    const rv = a.registrationVehicle;
    const code = a.vehicleEntryCode;
    const photoUrl = rv.eventPhotoObjectKey
      ? `/api/v/${encodeURIComponent(code)}/photo`
      : rv.vehicle.photoUrl?.trim()?.startsWith("http")
        ? rv.vehicle.photoUrl
        : null;

    const owner = resolveRegistrationContact(rv.registration);

    const sheetId = a.judgeScoreSheetId ?? a.judgeScoreSheet?.id;
    if (!sheetId) continue;

    const sheetStatus = a.judgeScoreSheet?.status ?? "DRAFT";
    const finalScore = a.judgeScoreSheet?.finalScore ?? null;

    vehicles.push({
      registrationVehicleId: rv.id,
      vehicleEntryCode: code,
      sheetId,
      year: rv.vehicle.year,
      make: rv.vehicle.make,
      model: rv.vehicle.model,
      trim: rv.vehicle.trim,
      vin: rv.vehicle.vin,
      nickname: rv.vehicleNickname ?? rv.vehicle.nickname,
      vehicleStory: rv.vehicleStory,
      photoUrl,
      ownerName: owner.name || null,
      vehicleClass: vehicleClassLabel(rv.eventCategory),
      judgingClassName: a.eventJudgingClass?.name ?? "Judging class",
      assignmentStatus: aggregateAssignmentStatus(group.statuses),
      assignedCategories: group.categories,
      sheetStatus,
      finalScore,
    });
  }

  vehicles.sort(
    (a, b) =>
      STATUS_SORT[a.assignmentStatus] - STATUS_SORT[b.assignmentStatus] ||
      a.vehicleEntryCode.localeCompare(b.vehicleEntryCode),
  );

  return { eventName: event.name, vehicles };
}

export type JudgeAssignedScorecardSectionView = {
  id: string;
  eventJudgingSectionId: string | null;
  name: string;
  sortOrder: number;
  judgeGuidance: string | null;
  maxSectionPoints: number | null;
  isAssigned: boolean;
  isEditable: boolean;
  assignmentStatus: EventJudgeCategoryAssignmentStatus | null;
  items: Array<{
    id: string;
    label: string;
    maxPoints: number;
    isIndented: boolean;
    pointType: string | null;
    scoringType: string;
    allowMultipleViolations: boolean;
    judgeGuidance: string | null;
    requiresCommentOnDeduction: boolean;
    itemNotes: string | null;
    deductionOptions: Array<{
      id: string;
      label: string;
      pointsDeducted: number;
    }>;
    deductions: Array<{
      optionId: string | null;
      violationCount: number;
      discretionaryPoints: number | null;
      comment: string | null;
    }>;
  }>;
};

export type JudgeAssignedScorecardDetail = {
  sheet: {
    id: string;
    status: "DRAFT" | "SUBMITTED" | "FINALIZED";
    methodology: "DEDUCTION" | "ADDITIVE" | "ORIGINALITY_CONDITION";
    totalPoints: number;
    generalNotes: string | null;
    vehicleEntryCode: string;
    eventJudgingClass: { id: string; name: string } | null;
  };
  vehicle: {
    year: number;
    make: string;
    model: string;
    trim: string | null;
    vin: string | null;
    nickname: string | null;
    vehicleStory: string | null;
    photoUrl: string | null;
    ownerName: string | null;
    vehicleClass: string;
  };
  sections: JudgeAssignedScorecardSectionView[];
  calculated: ReturnType<typeof calculateScorecardFromSheet>;
};

export async function loadJudgeAssignedScorecardDetail(
  judgeUserId: string,
  eventId: string,
  sheetId: string,
): Promise<JudgeAssignedScorecardDetail> {
  await assertJudgeForEvent(judgeUserId, eventId);

  const sheet = await prisma.judgeScoreSheet.findFirst({
    where: { id: sheetId, eventId, judgeUserId },
    include: {
      eventJudgingClass: { select: { id: true, name: true } },
      registrationVehicle: {
        include: {
          vehicle: {
            select: {
              year: true,
              make: true,
              model: true,
              trim: true,
              vin: true,
              nickname: true,
              photoUrl: true,
            },
          },
          eventCategory: {
            select: { customName: true, category: { select: { name: true } } },
          },
          registration: {
            select: {
              guestFirstName: true,
              guestLastName: true,
              guestEmail: true,
              guestPhone: true,
              registrantFirstName: true,
              registrantLastName: true,
              registrantEmail: true,
              registrantPhone: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  name: true,
                  email: true,
                  phone: true,
                  status: true,
                },
              },
            },
          },
        },
      },
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

  if (!sheet) {
    throw new JudgeScoreSheetAccessError("NOT_FOUND", "Score sheet not found.");
  }

  if (!sheet.registrationVehicleId) {
    throw new JudgeScoreSheetAccessError("VEHICLE_NOT_FOUND", "Vehicle not linked.");
  }

  const assignments = await prisma.eventJudgeCategoryAssignment.findMany({
    where: {
      eventId,
      judgeUserId,
      registrationVehicleId: sheet.registrationVehicleId ?? undefined,
    },
    select: {
      eventJudgingSectionId: true,
      status: true,
    },
  });

  const assignmentBySection = new Map(
    assignments.map((a) => [a.eventJudgingSectionId, a.status] as const),
  );

  const sheetReadOnly = sheet.status !== "DRAFT";
  const code = sheet.vehicleEntryCode;
  const rv = sheet.registrationVehicle;
  const photoUrl =
    rv?.eventPhotoObjectKey != null
      ? `/api/v/${encodeURIComponent(code)}/photo`
      : rv?.vehicle.photoUrl?.trim()?.startsWith("http")
        ? rv.vehicle.photoUrl
        : null;

  const owner = rv
    ? resolveRegistrationContact(rv.registration)
    : { name: "", email: "" };

  const sections: JudgeAssignedScorecardSectionView[] = sheet.sections
    .filter((s) => s.isActive)
    .map((section) => {
      const sectionKey = section.eventJudgingSectionId;
      const assignmentStatus = sectionKey
        ? (assignmentBySection.get(sectionKey) ?? null)
        : null;
      const isAssigned = assignmentStatus != null;
      const isEditable =
        isAssigned &&
        !sheetReadOnly &&
        assignmentStatus !== "SUBMITTED";

      return {
        id: section.id,
        eventJudgingSectionId: section.eventJudgingSectionId,
        name: section.name,
        sortOrder: section.sortOrder,
        judgeGuidance: section.judgeGuidance,
        maxSectionPoints: section.maxSectionPoints,
        isAssigned,
        isEditable,
        assignmentStatus,
        items: section.items
          .filter((item) => item.isActive)
          .map((item) => ({
            id: item.id,
            label: item.label,
            maxPoints: item.maxPoints,
            isIndented: item.isIndented,
            pointType: item.pointType,
            scoringType: item.scoringType,
            allowMultipleViolations: item.allowMultipleViolations,
            judgeGuidance: item.judgeGuidance,
            requiresCommentOnDeduction: item.requiresCommentOnDeduction,
            itemNotes: item.itemNotes,
            deductionOptions: item.deductionOptions.map((o) => ({
              id: o.id,
              label: o.label,
              pointsDeducted: o.pointsDeducted,
            })),
            deductions: item.deductions.map((d) => ({
              optionId: d.optionId,
              violationCount: d.violationCount,
              discretionaryPoints: d.discretionaryPoints,
              comment: d.comment,
            })),
          })),
      };
    });

  const calculated = calculateScorecardFromSheet({
    methodology: sheet.methodology,
    totalPoints: sheet.totalPoints,
    sections: sheet.sections.map((section) => ({
      weightPercent: section.weightPercent,
      maxSectionPoints: section.maxSectionPoints,
      items: section.items.map((item) => ({
        maxPoints: item.maxPoints,
        pointType: item.pointType,
        scoringType: item.scoringType,
        allowMultipleViolations: item.allowMultipleViolations,
        awardedPoints: item.awardedPoints,
        deductionOptions: item.deductionOptions,
        deductions: item.deductions.map((d) => ({
          optionId: d.optionId,
          pointsDeducted: d.pointsDeducted,
          violationCount: d.violationCount,
          discretionaryPoints: d.discretionaryPoints,
          deductionBucket: d.deductionBucket,
        })),
      })),
    })),
  });

  return {
    sheet: {
      id: sheet.id,
      status: sheet.status,
      methodology: sheet.methodology,
      totalPoints: sheet.totalPoints,
      generalNotes: sheet.generalNotes,
      vehicleEntryCode: sheet.vehicleEntryCode,
      eventJudgingClass: sheet.eventJudgingClass,
    },
    vehicle: {
      year: rv?.vehicle.year ?? 0,
      make: rv?.vehicle.make ?? "",
      model: rv?.vehicle.model ?? "",
      trim: rv?.vehicle.trim ?? null,
      vin: rv?.vehicle.vin ?? null,
      nickname: rv?.vehicleNickname ?? rv?.vehicle.nickname ?? null,
      vehicleStory: rv?.vehicleStory ?? null,
      photoUrl,
      ownerName: owner.name || null,
      vehicleClass: vehicleClassLabel(rv?.eventCategory ?? null),
    },
    sections,
    calculated,
  };
}

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  registrationVehicle: { findMany: vi.fn() },
  eventJudgingClassEligibleCategory: { findFirst: vi.fn() },
  eventJudgingSection: { findMany: vi.fn() },
  eventJudgeCategoryAssignment: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/judging/judge-ballot-allocation", () => ({
  listEventJudgeUserIds: vi.fn(),
}));

vi.mock("@/lib/judging/snapshot-score-sheet", () => ({
  findOrCreateJudgeScoreSheet: vi.fn(),
}));

import { prisma } from "@/lib/db";
import {
  assignJudgeToVehicleCategories,
  EventJudgeAssignmentError,
  previewJudgeCategoryAssignmentConflicts,
} from "@/lib/judging/event-judge-category-assignment";
import { listEventJudgeUserIds } from "@/lib/judging/judge-ballot-allocation";
import { findOrCreateJudgeScoreSheet } from "@/lib/judging/snapshot-score-sheet";

const eventId = "evt-1";
const judgeA = "judge-a";
const judgeB = "judge-b";
const organizer = "org-1";
const vehicleId = "rv-1";
const sectionId = "sec-1";
const templateId = "tpl-1";
const classId = "class-1";

describe("event judge category assignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listEventJudgeUserIds).mockResolvedValue([judgeA, judgeB]);
    vi.mocked(findOrCreateJudgeScoreSheet).mockResolvedValue({
      scoreSheet: { id: "sheet-1" },
      created: true,
    } as never);
  });

  it("rejects non-judge assignee", async () => {
    vi.mocked(listEventJudgeUserIds).mockResolvedValue([judgeA]);

    await expect(
      assignJudgeToVehicleCategories({
        eventId,
        assignedByUserId: organizer,
        judgeUserId: "not-judge",
        registrationVehicleIds: [vehicleId],
        eventJudgingSectionIds: [sectionId],
        replaceExisting: false,
      }),
    ).rejects.toMatchObject({ code: "NOT_A_JUDGE" } satisfies Partial<EventJudgeAssignmentError>);
  });

  it("rejects vehicles from another event", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: "Judge A" } as never);
    vi.mocked(prisma.registrationVehicle.findMany).mockResolvedValue([]);

    await expect(
      assignJudgeToVehicleCategories({
        eventId,
        assignedByUserId: organizer,
        judgeUserId: judgeA,
        registrationVehicleIds: [vehicleId],
        eventJudgingSectionIds: [sectionId],
        replaceExisting: false,
      }),
    ).rejects.toMatchObject({ code: "INVALID_VEHICLES" });
  });

  it("assigns one vehicle and one category with NOT_JUDGED default", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: "Judge A" } as never);
    vi.mocked(prisma.registrationVehicle.findMany).mockResolvedValue([
      {
        id: vehicleId,
        publicVehicleId: "ABC-001",
        registrationId: "reg-1",
        eventCategoryId: "cat-1",
      },
    ] as never);
    vi.mocked(prisma.eventJudgingClassEligibleCategory.findFirst).mockResolvedValue({
      eventJudgingClass: {
        id: classId,
        eventJudgingTemplateId: templateId,
      },
    } as never);
    vi.mocked(prisma.eventJudgingSection.findMany).mockResolvedValue([
      { id: sectionId, name: "Exterior" },
    ] as never);
    vi.mocked(prisma.eventJudgeCategoryAssignment.findMany).mockResolvedValue([]);
    vi.mocked(prisma.eventJudgeCategoryAssignment.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventJudgeCategoryAssignment.create).mockResolvedValue({} as never);

    const result = await assignJudgeToVehicleCategories({
      eventId,
      assignedByUserId: organizer,
      judgeUserId: judgeA,
      registrationVehicleIds: [vehicleId],
      eventJudgingSectionIds: [sectionId],
      replaceExisting: false,
    });

    expect(result.assignmentsCreated).toBe(1);
    expect(prisma.eventJudgeCategoryAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "NOT_JUDGED",
          judgeUserId: judgeA,
          eventJudgingSectionId: sectionId,
        }),
      }),
    );
  });

  it("blocks reassignment without replaceExisting", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: "Judge A" } as never);
    vi.mocked(prisma.registrationVehicle.findMany).mockResolvedValue([
      {
        id: vehicleId,
        publicVehicleId: "ABC-001",
        registrationId: "reg-1",
        eventCategoryId: "cat-1",
      },
    ] as never);
    vi.mocked(prisma.eventJudgingClassEligibleCategory.findFirst).mockResolvedValue({
      eventJudgingClass: { id: classId, eventJudgingTemplateId: templateId },
    } as never);
    vi.mocked(prisma.eventJudgingSection.findMany).mockResolvedValue([
      { id: sectionId, name: "Exterior" },
    ] as never);
    vi.mocked(prisma.eventJudgeCategoryAssignment.findMany).mockResolvedValue([
      {
        registrationVehicleId: vehicleId,
        eventJudgingSectionId: sectionId,
        judgeUserId: judgeB,
        judge: { id: judgeB, name: "Judge B" },
      },
    ] as never);

    await expect(
      assignJudgeToVehicleCategories({
        eventId,
        assignedByUserId: organizer,
        judgeUserId: judgeA,
        registrationVehicleIds: [vehicleId],
        eventJudgingSectionIds: [sectionId],
        replaceExisting: false,
      }),
    ).rejects.toMatchObject({ code: "CONFLICTS" });
  });

  it("replaces existing judge when replaceExisting is true", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: "Judge A" } as never);
    vi.mocked(prisma.registrationVehicle.findMany).mockResolvedValue([
      {
        id: vehicleId,
        publicVehicleId: "ABC-001",
        registrationId: "reg-1",
        eventCategoryId: "cat-1",
      },
    ] as never);
    vi.mocked(prisma.eventJudgingClassEligibleCategory.findFirst).mockResolvedValue({
      eventJudgingClass: { id: classId, eventJudgingTemplateId: templateId },
    } as never);
    vi.mocked(prisma.eventJudgingSection.findMany).mockResolvedValue([
      { id: sectionId, name: "Exterior" },
    ] as never);
    vi.mocked(prisma.eventJudgeCategoryAssignment.findMany).mockResolvedValue([]);
    vi.mocked(prisma.eventJudgeCategoryAssignment.findUnique).mockResolvedValue({
      id: "assign-1",
      judgeUserId: judgeB,
      judgeScoreSheetId: "sheet-old",
      reassignedFromJudgeUserId: null,
    } as never);
    vi.mocked(prisma.eventJudgeCategoryAssignment.update).mockResolvedValue({} as never);

    const result = await assignJudgeToVehicleCategories({
      eventId,
      assignedByUserId: organizer,
      judgeUserId: judgeA,
      registrationVehicleIds: [vehicleId],
      eventJudgingSectionIds: [sectionId],
      replaceExisting: true,
    });

    expect(result.assignmentsUpdated).toBe(1);
    expect(prisma.eventJudgeCategoryAssignment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          judgeUserId: judgeA,
          reassignedFromJudgeUserId: judgeB,
          status: "NOT_JUDGED",
        }),
      }),
    );
  });

  it("preview lists conflicts for another judge on same vehicle/category", async () => {
    vi.mocked(prisma.registrationVehicle.findMany).mockResolvedValue([
      {
        id: vehicleId,
        publicVehicleId: "ABC-001",
        registrationId: "reg-1",
        eventCategoryId: "cat-1",
      },
    ] as never);
    vi.mocked(prisma.eventJudgingClassEligibleCategory.findFirst).mockResolvedValue({
      eventJudgingClass: { id: classId, eventJudgingTemplateId: templateId },
    } as never);
    vi.mocked(prisma.eventJudgingSection.findMany).mockResolvedValue([
      { id: sectionId, name: "Exterior" },
    ] as never);
    vi.mocked(prisma.eventJudgeCategoryAssignment.findMany).mockResolvedValue([
      {
        registrationVehicleId: vehicleId,
        eventJudgingSectionId: sectionId,
        judgeUserId: judgeB,
        judge: { name: "Judge B" },
      },
    ] as never);

    const conflicts = await previewJudgeCategoryAssignmentConflicts({
      eventId,
      judgeUserId: judgeA,
      registrationVehicleIds: [vehicleId],
      eventJudgingSectionIds: [sectionId],
    });

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.currentJudgeName).toBe("Judge B");
  });
});

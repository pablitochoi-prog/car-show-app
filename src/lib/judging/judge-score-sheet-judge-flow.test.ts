import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { cloneJudgingTemplateToEvent } from "@/lib/judging/clone-judging-template-to-event";
import {
  listJudgeScoreSheetAssignments,
  loadJudgeScoreSheetAssignmentSummary,
  startOrResumeJudgeScoreSheet,
} from "@/lib/judging/judge-score-sheet-judge-data";
import {
  saveJudgeScoreSheetDraft,
  submitJudgeScoreSheet,
} from "@/lib/judging/judge-score-sheet-mutations";
import { listEventJudgeUserIds } from "@/lib/judging/judge-ballot-allocation";

const prisma = new PrismaClient();
const RUN = process.env.JUDGING_INTEGRATION_TESTS === "1" || !!process.env.DATABASE_URL;

const cleanup = {
  classIds: [] as string[],
  templateIds: [] as string[],
  sheetIds: [] as string[],
  eventCategoryIds: [] as string[],
};

async function releaseVitestJudgingCategories(eventId: string) {
  const rows = await prisma.eventCategory.findMany({
    where: { eventId, customName: { startsWith: "Vitest " } },
    select: { id: true },
  });
  for (const row of rows) {
    await prisma.eventJudgingClassEligibleCategory.deleteMany({
      where: { eventCategoryId: row.id },
    });
    await prisma.eventCategory.deleteMany({ where: { id: row.id } });
  }
}

describe.skipIf(!RUN).sequential("Phase 2E judge score sheet flow", () => {
  let eventId: string;
  let judgeUserId: string;
  let nonJudgeUserId: string;
  let eventCategoryId: string;
  let vehicleEntryCode: string;
  let classId: string;
  let registrationVehicleId: string;
  let originalEventCategoryId: string | null = null;

  beforeAll(async () => {
    const event = await prisma.event.findFirst({
      where: { status: { in: ["DRAFT", "PUBLISHED", "ACTIVE"] } },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (!event) throw new Error("No event found for tests.");
    eventId = event.id;
    await releaseVitestJudgingCategories(eventId);

    const rv = await prisma.registrationVehicle.findFirst({
      where: {
        registration: { eventId },
        publicVehicleId: { not: null },
        eventCategoryId: { not: null },
      },
      select: { id: true, publicVehicleId: true, eventCategoryId: true },
    });
    if (!rv?.publicVehicleId || !rv.eventCategoryId) {
      throw new Error("Need registration vehicle with event class and entry code.");
    }
    registrationVehicleId = rv.id;
    vehicleEntryCode = rv.publicVehicleId;
    originalEventCategoryId = rv.eventCategoryId;

    const isolatedCategory = await prisma.eventCategory.create({
      data: {
        eventId,
        customName: `Vitest 2E Judge Flow ${Date.now()}`,
      },
      select: { id: true },
    });
    eventCategoryId = isolatedCategory.id;
    cleanup.eventCategoryIds.push(isolatedCategory.id);

    await prisma.registrationVehicle.update({
      where: { id: registrationVehicleId },
      data: { eventCategoryId },
    });

    judgeUserId = (await listEventJudgeUserIds(eventId))[0] ?? "";
    if (!judgeUserId) {
      const user = await prisma.user.findFirst({ where: { status: "ACTIVE" } });
      if (!user) throw new Error("No user for judge fixture.");
      judgeUserId = user.id;
      await prisma.eventStaffMember.upsert({
        where: { eventId_userId: { eventId, userId: judgeUserId } },
        create: { eventId, userId: judgeUserId },
        update: {},
      });
      let role = await prisma.eventRoleDefinition.findFirst({
        where: { eventId, slug: "judge" },
      });
      if (!role) {
        role = await prisma.eventRoleDefinition.create({
          data: {
            eventId,
            slug: "judge",
            name: "Judge",
            isDefault: true,
            sortOrder: 3,
          },
        });
      }
      const staff = await prisma.eventStaffMember.findUnique({
        where: { eventId_userId: { eventId, userId: judgeUserId } },
      });
      if (staff) {
        await prisma.eventStaffRoleLink.upsert({
          where: {
            staffMemberId_roleId: { staffMemberId: staff.id, roleId: role.id },
          },
          create: { staffMemberId: staff.id, roleId: role.id },
          update: {},
        });
      }
    }

    nonJudgeUserId =
      (
        await prisma.user.findFirst({
          where: { id: { not: judgeUserId }, status: "ACTIVE" },
          select: { id: true },
        })
      )?.id ?? judgeUserId;

    const source = await prisma.judgingTemplate.findFirst({
      where: { slug: "pca", isActive: true },
      select: { id: true },
    });
    if (!source) throw new Error("Need an active global judging template.");
    const template = await cloneJudgingTemplateToEvent({
      eventId,
      sourceTemplateId: source.id,
    });
    cleanup.templateIds.push(template.eventTemplateId);

    const scoringItem = await prisma.eventJudgingItem.findFirst({
      where: {
        section: { templateId: template.eventTemplateId },
        scoringType: { in: ["LEVELS", "FULL"] },
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        _count: { select: { deductionOptions: true } },
      },
    });
    if (scoringItem) {
      if (scoringItem._count.deductionOptions === 0) {
        await prisma.eventJudgingDeductionOption.create({
          data: {
            itemId: scoringItem.id,
            label: "Vitest deduction",
            pointsDeducted: 1,
            sortOrder: 0,
          },
        });
      }
      await prisma.eventJudgingItem.update({
        where: { id: scoringItem.id },
        data: { requiresCommentOnDeduction: true },
      });
    }

    const cls = await prisma.eventJudgingClass.create({
      data: {
        eventId,
        name: `2E Class ${Date.now()}`,
        eventJudgingTemplateId: template.eventTemplateId,
        isActive: true,
        eligibleCategories: {
          create: { eventCategoryId },
        },
      },
      select: { id: true },
    });
    classId = cls.id;
    cleanup.classIds.push(classId);
  });

  afterAll(async () => {
    if (!RUN) return;
    for (const id of cleanup.sheetIds) {
      await prisma.judgeScoreSheet.deleteMany({ where: { id } });
    }
    for (const id of cleanup.classIds) {
      await prisma.eventJudgingClassEligibleCategory.deleteMany({
        where: { eventJudgingClassId: id },
      });
      await prisma.eventJudgingClass.deleteMany({ where: { id } });
    }
    for (const id of cleanup.templateIds) {
      await prisma.eventJudgingTemplate.deleteMany({ where: { id } });
    }
    if (registrationVehicleId && originalEventCategoryId) {
      await prisma.registrationVehicle.update({
        where: { id: registrationVehicleId },
        data: { eventCategoryId: originalEventCategoryId },
      });
    }
    for (const id of cleanup.eventCategoryIds) {
      await prisma.eventJudgingClassEligibleCategory.deleteMany({
        where: { eventCategoryId: id },
      });
      await prisma.eventCategory.deleteMany({ where: { id } });
    }
    if (eventId) {
      await releaseVitestJudgingCategories(eventId);
    }
    await prisma.$disconnect();
  });

  it("judge sees score sheet assignment summary and list", async () => {
    const summary = await loadJudgeScoreSheetAssignmentSummary(judgeUserId, eventId);
    expect(summary.scoreSheetAssignmentCount).toBeGreaterThan(0);
    const classes = await listJudgeScoreSheetAssignments(judgeUserId, eventId);
    expect(classes.some((c) => c.classId === classId)).toBe(true);
  });

  it("judge starts a score sheet snapshot and resumes same sheet", async () => {
    const first = await startOrResumeJudgeScoreSheet({
      judgeUserId,
      eventId,
      classId,
      vehicleEntryCode,
    });
    cleanup.sheetIds.push(first.sheetId);
    const second = await startOrResumeJudgeScoreSheet({
      judgeUserId,
      eventId,
      classId,
      vehicleEntryCode,
    });
    expect(second.sheetId).toBe(first.sheetId);
  });

  it("judge can save draft, required comments enforced, and submitted sheet is read-only", async () => {
    await prisma.judgeScoreSheet.deleteMany({
      where: { eventId, judgeUserId, vehicleEntryCode },
    });

    const { sheetId } = await startOrResumeJudgeScoreSheet({
      judgeUserId,
      eventId,
      classId,
      vehicleEntryCode,
    });
    cleanup.sheetIds.push(sheetId);

    const sheetItem = await prisma.judgeScoreSheetItem.findFirst({
      where: { section: { scoreSheetId: sheetId } },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });
    expect(sheetItem).toBeTruthy();
    await prisma.judgeScoreSheetDeductionOption.deleteMany({
      where: { itemId: sheetItem!.id },
    });
    const firstOption = await prisma.judgeScoreSheetDeductionOption.create({
      data: {
        itemId: sheetItem!.id,
        label: "Vitest sheet deduction",
        pointsDeducted: 1,
        sortOrder: 0,
      },
    });
    await prisma.judgeScoreSheetItem.update({
      where: { id: sheetItem!.id },
      data: { requiresCommentOnDeduction: true },
    });
    const item = { id: sheetItem!.id, deductionOptions: [firstOption] };

    await expect(
      saveJudgeScoreSheetDraft({
        judgeUserId,
        eventId,
        sheetId,
        generalNotes: "Draft note",
        items: [
          {
            itemId: item!.id,
            awardedPoints: null,
            deductionOptionIds: [firstOption.id],
            deductionComments: {},
          },
        ],
      }),
    ).rejects.toThrow(/Deduction comment is required/i);

    const calculated = await saveJudgeScoreSheetDraft({
      judgeUserId,
      eventId,
      sheetId,
      generalNotes: "Draft note",
      items: [
        {
          itemId: item!.id,
          awardedPoints: null,
          deductionOptionIds: [firstOption.id],
          deductionComments: { [firstOption.id]: "Observed issue" },
        },
      ],
    });
    const scoreSheet = await prisma.judgeScoreSheet.findUnique({
      where: { id: sheetId },
      select: { totalPoints: true },
    });
    expect(calculated.finalScore).toBeLessThanOrEqual(scoreSheet!.totalPoints);

    await submitJudgeScoreSheet({ judgeUserId, eventId, sheetId });

    await expect(
      saveJudgeScoreSheetDraft({
        judgeUserId,
        eventId,
        sheetId,
        items: [],
      }),
    ).rejects.toThrow(/read-only/i);
  });

  it("blocks unauthorized judge from score sheet start", async () => {
    if (nonJudgeUserId === judgeUserId) return;
    await expect(
      startOrResumeJudgeScoreSheet({
        judgeUserId: nonJudgeUserId,
        eventId,
        classId,
        vehicleEntryCode,
      }),
    ).rejects.toThrow(/not assigned as a judge/i);
  });
});

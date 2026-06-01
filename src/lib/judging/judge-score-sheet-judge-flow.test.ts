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
};

describe.skipIf(!RUN)("Phase 2E judge score sheet flow", () => {
  let eventId: string;
  let judgeUserId: string;
  let nonJudgeUserId: string;
  let eventCategoryId: string;
  let vehicleEntryCode: string;
  let classId: string;

  beforeAll(async () => {
    const event = await prisma.event.findFirst({
      where: { status: { in: ["DRAFT", "PUBLISHED", "ACTIVE"] } },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (!event) throw new Error("No event found for tests.");
    eventId = event.id;

    const rv = await prisma.registrationVehicle.findFirst({
      where: {
        registration: { eventId },
        publicVehicleId: { not: null },
        eventCategoryId: { not: null },
      },
      select: { publicVehicleId: true, eventCategoryId: true },
    });
    if (!rv?.publicVehicleId || !rv.eventCategoryId) {
      throw new Error("Need registration vehicle with event class and entry code.");
    }
    vehicleEntryCode = rv.publicVehicleId;
    eventCategoryId = rv.eventCategoryId;

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
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });
    if (!source) throw new Error("Need an active global judging template.");
    const template = await cloneJudgingTemplateToEvent({
      eventId,
      sourceTemplateId: source.id,
    });
    cleanup.templateIds.push(template.eventTemplateId);

    const firstItem = await prisma.eventJudgingItem.findFirst({
      where: {
        section: {
          templateId: template.eventTemplateId,
        },
      },
      orderBy: { sortOrder: "asc" },
    });
    if (firstItem) {
      await prisma.eventJudgingItem.update({
        where: { id: firstItem.id },
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
      await prisma.eventJudgingClass.deleteMany({ where: { id } });
    }
    for (const id of cleanup.templateIds) {
      await prisma.eventJudgingTemplate.deleteMany({ where: { id } });
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
    const { sheetId } = await startOrResumeJudgeScoreSheet({
      judgeUserId,
      eventId,
      classId,
      vehicleEntryCode,
    });

    const sheet = await prisma.judgeScoreSheet.findUnique({
      where: { id: sheetId },
      include: {
        sections: {
          include: {
            items: {
              include: {
                deductionOptions: true,
              },
            },
          },
        },
      },
    });
    expect(sheet).toBeTruthy();
    const item = sheet!.sections[0]?.items[0];
    expect(item).toBeTruthy();
    const firstOption = item!.deductionOptions[0];
    expect(firstOption).toBeTruthy();

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
    expect(calculated.finalScore).toBeLessThanOrEqual(sheet!.totalPoints);

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

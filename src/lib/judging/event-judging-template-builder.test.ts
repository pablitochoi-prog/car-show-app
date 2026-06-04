/**
 * Phase 2D score sheet template builder — integration tests.
 * Run: npm run test:judging-integration
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { cloneJudgingTemplateToEvent } from "@/lib/judging/clone-judging-template-to-event";
import { snapshotEventTemplateToScoreSheet } from "@/lib/judging/snapshot-score-sheet";
import {
  loadEventJudgingTemplate,
  updateEventJudgingTemplateStructure,
} from "@/lib/judging/event-judging-template-service";
import { resolveEventTemplateEditLock } from "@/lib/judging/event-judging-edit-lock";
import {
  createEventJudgingClass,
  listEventJudgingClasses,
} from "@/lib/judging/event-judging-class-service";
import { listEventJudgeUserIds } from "@/lib/judging/judge-ballot-allocation";

const prisma = new PrismaClient();
const RUN = process.env.JUDGING_INTEGRATION_TESTS === "1" || !!process.env.DATABASE_URL;

const cleanup = {
  eventTemplateIds: [] as string[],
  judgingClassIds: [] as string[],
  scoreSheetIds: [] as string[],
};

describe.skipIf(!RUN)("Phase 2D score sheet template builder", () => {
  let eventId: string;
  let eventCategoryId: string;
  let globalTemplateId: string;
  let eventTemplateId: string;
  let judgeUserId: string;
  let registrationId: string;
  let registrationVehicleId: string;
  let vehicleEntryCode: string;

  beforeAll(async () => {
    const globalTemplate = await prisma.judgingTemplate.findFirst({
      where: { slug: "pca", isActive: true },
    });
    if (!globalTemplate) {
      throw new Error("Run db:seed-judging-templates before integration tests.");
    }
    globalTemplateId = globalTemplate.id;

    const event = await prisma.event.findFirst({
      where: { status: { in: ["DRAFT", "PUBLISHED", "ACTIVE"] } },
      orderBy: { updatedAt: "desc" },
    });
    if (!event) throw new Error("No event for tests.");
    eventId = event.id;

    const ec = await prisma.eventCategory.findFirst({ where: { eventId } });
    if (!ec) throw new Error("Need event category.");
    eventCategoryId = ec.id;

    const rv = await prisma.registrationVehicle.findFirst({
      where: { registration: { eventId }, publicVehicleId: { not: null } },
    });
    if (!rv?.publicVehicleId) throw new Error("Need vehicle entry code.");
    registrationId = rv.registrationId;
    registrationVehicleId = rv.id;
    vehicleEntryCode = rv.publicVehicleId;

    judgeUserId = (await listEventJudgeUserIds(eventId))[0] ?? "";
    if (!judgeUserId) {
      const u = await prisma.user.findFirst({ where: { status: "ACTIVE" } });
      if (!u) throw new Error("No user.");
      judgeUserId = u.id;
    }

    const cloned = await cloneJudgingTemplateToEvent({
      eventId,
      sourceTemplateId: globalTemplateId,
      name: `2D Builder Test ${Date.now()}`,
    });
    eventTemplateId = cloned.eventTemplateId;
    cleanup.eventTemplateIds.push(eventTemplateId);
  });

  afterAll(async () => {
    if (!RUN) return;
    for (const id of cleanup.scoreSheetIds) {
      await prisma.judgeScoreSheet.deleteMany({ where: { id } });
    }
    for (const id of cleanup.judgingClassIds) {
      await prisma.eventJudgingClassEligibleCategory.deleteMany({
        where: { eventJudgingClassId: id },
      });
      await prisma.eventJudgingClass.deleteMany({ where: { id } });
    }
    for (const id of cleanup.eventTemplateIds) {
      await prisma.eventJudgingTemplate.deleteMany({ where: { id } });
    }
    await prisma.$disconnect();
  });

  it("loads cloned template structure for the builder", async () => {
    const loaded = await loadEventJudgingTemplate(eventId, eventTemplateId);
    expect(loaded).not.toBeNull();
    expect(loaded!.template.sections.length).toBeGreaterThan(0);
    expect(loaded!.template.sections[0].items.length).toBeGreaterThan(0);
    expect(loaded!.editLockInfo.canEditStructure).toBe(true);
  });

  it("allows structural updates before any score sheets exist", async () => {
    const loaded = await loadEventJudgingTemplate(eventId, eventTemplateId);
    const section = loaded!.template.sections[0];
    const item = section.items[0];

    await updateEventJudgingTemplateStructure({
      eventId,
      templateId: eventTemplateId,
      scoringGroup: "AACA",
      vehicleType: "Auto",
      sections: [
        {
          name: "Updated Section",
          sortOrder: 0,
          maxSectionPoints: loaded!.template.totalPoints,
          items: [
            {
              label: "Updated Criteria",
              sortOrder: 0,
              maxPoints: item.maxPoints,
              scoringType: "LEVELS",
              requiresCommentOnDeduction: true,
              deductionOptions: [
                {
                  label: "New deduction",
                  pointsDeducted: 2,
                  sortOrder: 0,
                },
              ],
            },
          ],
        },
      ],
    });

    const reloaded = await loadEventJudgingTemplate(eventId, eventTemplateId);
    expect(reloaded!.template.scoringGroup).toBe("AACA");
    expect(reloaded!.template.vehicleType).toBe("Auto");
    expect(reloaded!.template.sections[0].name).toBe("Updated Section");
    expect(reloaded!.template.sections[0].items[0].label).toBe("Updated Criteria");
    expect(
      reloaded!.template.sections[0].items[0].deductionOptions[0].label,
    ).toBe("New deduction");
  });

  it("persists scoring type changes on existing subcategories", async () => {
    const loaded = await loadEventJudgingTemplate(eventId, eventTemplateId);
    const interior = loaded!.template.sections.find((s) => s.name === "Interior");
    expect(interior).toBeDefined();
    expect(interior!.items.length).toBeGreaterThanOrEqual(4);

    const sectionsPayload = loaded!.template.sections.map((s) => ({
      id: s.id,
      name: s.name,
      sortOrder: s.sortOrder,
      weightPercent: s.weightPercent,
      maxSectionPoints: s.maxSectionPoints,
      judgeGuidance: s.judgeGuidance,
      isActive: s.isActive,
      items: s.items.map((item, ii) => {
        const scoringType =
          s.id === interior!.id
            ? ii === 1
              ? ("LEVELS" as const)
              : ii === 2
                ? ("FULL" as const)
                : ii === 3
                  ? ("FULL" as const)
                  : item.scoringType
            : item.scoringType;
        const allowMultipleViolations =
          s.id === interior!.id && ii === 3 ? true : item.allowMultipleViolations;
        const deductionOptions =
          scoringType === "DISCRETIONARY"
            ? []
            : scoringType === "FULL"
              ? [
                  {
                    label: allowMultipleViolations ? "Per violation" : "If observed",
                    pointsDeducted: allowMultipleViolations ? 1 : item.maxPoints,
                    sortOrder: 0,
                  },
                ]
              : scoringType === "LEVELS" && item.scoringType !== "LEVELS"
                ? [
                    { label: "Minor", pointsDeducted: 1, sortOrder: 0 },
                    { label: "Major", pointsDeducted: 3, sortOrder: 1 },
                    { label: "Critical", pointsDeducted: item.maxPoints, sortOrder: 2 },
                  ]
                : item.deductionOptions.map((d) => ({
                    label: d.label,
                    pointsDeducted: d.pointsDeducted,
                    sortOrder: d.sortOrder,
                    deductionBucket: d.deductionBucket,
                  }));

        return {
          id: item.id,
          label: item.label,
          sortOrder: item.sortOrder,
          maxPoints: item.maxPoints,
          isIndented: item.isIndented,
          pointType: item.pointType,
          scoringType,
          allowMultipleViolations,
          judgeGuidance: item.judgeGuidance,
          requiresCommentOnDeduction: item.requiresCommentOnDeduction,
          isActive: item.isActive,
          deductionOptions,
        };
      }),
    }));

    await updateEventJudgingTemplateStructure({
      eventId,
      templateId: eventTemplateId,
      sections: sectionsPayload,
    });

    const reloaded = await loadEventJudgingTemplate(eventId, eventTemplateId);
    const interiorReloaded = reloaded!.template.sections.find(
      (s) => s.id === interior!.id,
    );
    expect(interiorReloaded!.items[1].scoringType).toBe("LEVELS");
    expect(interiorReloaded!.items[2].scoringType).toBe("FULL");
    expect(interiorReloaded!.items[2].allowMultipleViolations).toBe(false);
    expect(interiorReloaded!.items[3].scoringType).toBe("FULL");
    expect(interiorReloaded!.items[3].allowMultipleViolations).toBe(true);
  });

  it("blocks structural edits after submitted score sheets exist", async () => {
    const sheet = await snapshotEventTemplateToScoreSheet({
      eventId,
      eventJudgingTemplateId: eventTemplateId,
      vehicleEntryCode: `2d-${Date.now()}`,
      registrationId,
      registrationVehicleId,
      judgeUserId,
    });
    cleanup.scoreSheetIds.push(sheet.id);

    await prisma.judgeScoreSheet.update({
      where: { id: sheet.id },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });

    const lock = await resolveEventTemplateEditLock(eventTemplateId);
    expect(lock.canEditStructure).toBe(false);
    expect(lock.editLock).toBe("LOCKED");

    const loaded = await loadEventJudgingTemplate(eventId, eventTemplateId);
    await expect(
      updateEventJudgingTemplateStructure({
        eventId,
        templateId: eventTemplateId,
        sections: loaded!.template.sections.map((s) => ({
          name: "Blocked Rename",
          sortOrder: s.sortOrder,
          maxSectionPoints: s.maxSectionPoints,
          items: s.items.map((i) => ({
            label: i.label,
            sortOrder: i.sortOrder,
            maxPoints: i.maxPoints,
            deductionOptions: i.deductionOptions.map((d) => ({
              label: d.label,
              pointsDeducted: d.pointsDeducted,
              sortOrder: d.sortOrder,
              deductionBucket: d.deductionBucket,
            })),
          })),
        })),
      }),
    ).rejects.toThrow(/locked/i);
  });

  it("does not mutate score sheet snapshots when template is edited elsewhere", async () => {
    const otherClone = await cloneJudgingTemplateToEvent({
      eventId,
      sourceTemplateId: globalTemplateId,
      name: `2D Snapshot Isolation ${Date.now()}`,
    });
    cleanup.eventTemplateIds.push(otherClone.eventTemplateId);

    const sheet = await snapshotEventTemplateToScoreSheet({
      eventId,
      eventJudgingTemplateId: otherClone.eventTemplateId,
      vehicleEntryCode: `2d-snap-${Date.now()}`,
      registrationId,
      registrationVehicleId,
      judgeUserId,
    });
    cleanup.scoreSheetIds.push(sheet.id);

    const snapshotSectionName = sheet.sections[0].name;

    await updateEventJudgingTemplateStructure({
      eventId,
      templateId: otherClone.eventTemplateId,
      sections: [
        {
          name: "Template Changed After Snapshot",
          sortOrder: 0,
          maxSectionPoints: sheet.totalPoints,
          items: [
            {
              label: "Different criteria",
              sortOrder: 0,
              maxPoints: sheet.totalPoints,
              deductionOptions: [],
            },
          ],
        },
      ],
    });

    const unchanged = await prisma.judgeScoreSheet.findUnique({
      where: { id: sheet.id },
      include: { sections: true },
    });
    expect(unchanged!.sections[0].name).toBe(snapshotSectionName);
    expect(unchanged!.sections[0].name).not.toBe("Template Changed After Snapshot");
  });

  it("creates EventJudgingClass mapped to template and vehicle class", async () => {
    const judgingClass = await createEventJudgingClass(eventId, {
      name: "PCA Judging Class",
      description: "Test mapping",
      eventJudgingTemplateId: eventTemplateId,
      eligibleEventCategoryIds: [eventCategoryId],
      sortOrder: 1,
    });
    cleanup.judgingClassIds.push(judgingClass.id);

    const list = await listEventJudgingClasses(eventId);
    expect(list.some((c) => c.id === judgingClass.id)).toBe(true);
    expect(judgingClass.eligibleEventCategoryIds).toContain(eventCategoryId);
    expect(judgingClass.templateName).toBeTruthy();
  });

  it("surfaces point total mismatch warnings", async () => {
    const warnClone = await cloneJudgingTemplateToEvent({
      eventId,
      sourceTemplateId: globalTemplateId,
      name: `2D Warnings ${Date.now()}`,
    });
    cleanup.eventTemplateIds.push(warnClone.eventTemplateId);

    const loaded = await loadEventJudgingTemplate(eventId, warnClone.eventTemplateId);
    expect(loaded!.warnings.some((w) => w.code.includes("MISMATCH"))).toBe(false);

    await updateEventJudgingTemplateStructure({
      eventId,
      templateId: warnClone.eventTemplateId,
      sections: [
        {
          name: "Under total",
          sortOrder: 0,
          maxSectionPoints: 50,
          items: [{ label: "A", sortOrder: 0, maxPoints: 50, deductionOptions: [] }],
        },
      ],
    });

    const reloaded = await loadEventJudgingTemplate(eventId, warnClone.eventTemplateId);
    expect(reloaded!.warnings.some((w) => w.code === "SECTION_TOTAL_MISMATCH")).toBe(
      true,
    );
  });
});

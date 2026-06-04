/**
 * Phase 1C backend verification — runs against the dev database.
 * Usage: npm run test:judging-integration
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { cloneJudgingTemplateToEvent } from "@/lib/judging/clone-judging-template-to-event";
import { snapshotEventTemplateToScoreSheet } from "@/lib/judging/snapshot-score-sheet";
import { calculateScoreFromSnapshot } from "@/lib/judging/calculate-score-from-snapshot";
import {
  openJudgeBallotCategory,
  closeJudgeBallotCategory,
  assertJudgeCanVoteInCategory,
  listEventJudgeUserIds,
} from "@/lib/judging/judge-ballot-allocation";
import { upsertJudgeBallotVote } from "@/lib/judging/upsert-judge-ballot-vote";
import { aggregateJudgeBallotResults } from "@/lib/judging/judge-ballot-results";
import {
  isVehicleEligibleForBallotCategory,
  validateJudgeBallotVoteUpsert,
} from "@/lib/judging/judge-ballot-validation";
import { getUserEventRoles } from "@/lib/event-staff";

const prisma = new PrismaClient();
const RUN = process.env.JUDGING_INTEGRATION_TESTS === "1" || !!process.env.DATABASE_URL;

const cleanup = {
  eventTemplateIds: [] as string[],
  ballotCategoryIds: [] as string[],
  scoreSheetIds: [] as string[],
  staffMemberIds: [] as string[],
};

describe.skipIf(!RUN)("Phase 1C judging integration", () => {
  let eventId: string;
  let eventCategoryId: string;
  let judgeUserId: string;
  let nonJudgeUserId: string;
  let globalTemplateId: string;
  let registrationId: string;
  let registrationVehicleId: string;
  let vehicleEntryCode: string;

  beforeAll(async () => {
    const globalTemplate = await prisma.judgingTemplate.findFirst({
      where: { slug: "pca", isActive: true },
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
    if (!globalTemplate) {
      throw new Error("Run db:seed-judging-templates before integration tests.");
    }
    globalTemplateId = globalTemplate.id;

    const event = await prisma.event.findFirst({
      where: { status: { in: ["DRAFT", "PUBLISHED", "ACTIVE"] } },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (!event) throw new Error("No event found for integration tests.");
    eventId = event.id;

    const eventCategory = await prisma.eventCategory.findFirst({
      where: { eventId },
      select: { id: true },
    });
    if (!eventCategory) {
      throw new Error("Event needs at least one vehicle class for integration tests.");
    }
    eventCategoryId = eventCategory.id;

    const rv = await prisma.registrationVehicle.findFirst({
      where: {
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
    if (!rv?.publicVehicleId) {
      throw new Error("Event needs a registered vehicle with entry code.");
    }
    registrationVehicleId = rv.id;
    registrationId = rv.registrationId;
    vehicleEntryCode = rv.publicVehicleId;

    judgeUserId = (await listEventJudgeUserIds(eventId))[0] ?? "";
    if (!judgeUserId) {
      const anyUser = await prisma.user.findFirst({
        where: { status: "ACTIVE" },
        select: { id: true },
      });
      if (!anyUser) throw new Error("No user for judge fixture.");
      judgeUserId = anyUser.id;

      await prisma.eventStaffMember.upsert({
        where: { eventId_userId: { userId: judgeUserId, eventId } },
        create: { userId: judgeUserId, eventId },
        update: {},
      });

      let judgeRole = await prisma.eventRoleDefinition.findFirst({
        where: { eventId, slug: "judge" },
      });
      if (!judgeRole) {
        judgeRole = await prisma.eventRoleDefinition.create({
          data: { eventId, slug: "judge", name: "Judge", isDefault: true, sortOrder: 3 },
        });
      }

      const staff = await prisma.eventStaffMember.findUnique({
        where: { eventId_userId: { userId: judgeUserId, eventId } },
      });
      if (staff) {
        cleanup.staffMemberIds.push(staff.id);
        await prisma.eventStaffRoleLink.upsert({
          where: {
            staffMemberId_roleId: {
              staffMemberId: staff.id,
              roleId: judgeRole.id,
            },
          },
          create: { staffMemberId: staff.id, roleId: judgeRole.id },
          update: {},
        });
      }
    }

    const nonJudge = await prisma.user.findFirst({
      where: { id: { not: judgeUserId }, status: "ACTIVE" },
      select: { id: true },
    });
    nonJudgeUserId = nonJudge?.id ?? judgeUserId;
  });

  afterAll(async () => {
    if (!RUN) return;

    await Promise.all(
      cleanup.scoreSheetIds.map((id) =>
        prisma.judgeScoreSheet.deleteMany({ where: { id } }),
      ),
    );
    for (const id of cleanup.ballotCategoryIds) {
      await prisma.judgeBallotVote.deleteMany({ where: { categoryId: id } });
      await prisma.judgeBallotAllocation.deleteMany({ where: { categoryId: id } });
      await prisma.judgeBallotEligibleClass.deleteMany({ where: { categoryId: id } });
      await prisma.judgeBallotCategoryJudge.deleteMany({ where: { categoryId: id } });
      await prisma.judgeBallotCategory.deleteMany({ where: { id } });
    }
    for (const id of cleanup.eventTemplateIds) {
      await prisma.eventJudgingTemplate.deleteMany({ where: { id } });
    }
    for (const id of cleanup.staffMemberIds) {
      await prisma.eventStaffRoleLink.deleteMany({ where: { staffMemberId: id } });
      await prisma.eventStaffMember.deleteMany({ where: { id } });
    }

    await prisma.$disconnect();
  });

  it("lists global judging templates with section counts", async () => {
    const templates = await prisma.judgingTemplate.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { sections: true } } },
    });
    expect(templates.length).toBeGreaterThanOrEqual(4);
    expect(templates.some((t) => t.slug === "pca")).toBe(true);
    for (const t of templates) {
      expect(t._count.sections).toBeGreaterThan(0);
    }
  });

  it("clones global template to event with full structure", async () => {
    const global = await prisma.judgingTemplate.findUnique({
      where: { id: globalTemplateId },
      include: {
        sections: {
          include: {
            items: { include: { deductionOptions: true } },
          },
        },
      },
    });
    expect(global).toBeTruthy();

    const result = await cloneJudgingTemplateToEvent({
      eventId,
      sourceTemplateId: globalTemplateId,
    });
    cleanup.eventTemplateIds.push(result.eventTemplateId);

    expect(result.sectionCount).toBe(global!.sections.length);
    expect(result.itemCount).toBeGreaterThan(0);

    const eventCopy = await prisma.eventJudgingTemplate.findUnique({
      where: { id: result.eventTemplateId },
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

    expect(eventCopy?.methodology).toBe(global!.methodology);
    expect(eventCopy?.totalPoints).toBe(global!.totalPoints);
    expect(eventCopy?.sections).toHaveLength(global!.sections.length);

    const srcSection = global!.sections[0]!;
    const dstSection = eventCopy!.sections[0]!;
    expect(dstSection.name).toBe(srcSection.name);
    expect(dstSection.judgeGuidance).toBe(srcSection.judgeGuidance);
    expect(dstSection.items).toHaveLength(srcSection.items.length);
    expect(dstSection.items[0]!.label).toBe(srcSection.items[0]!.label);
    expect(dstSection.items[0]!.deductionOptions).toHaveLength(
      srcSection.items[0]!.deductionOptions.length,
    );
  });

  it("creates separate event templates on each intentional clone", async () => {
    const r1 = await cloneJudgingTemplateToEvent({
      eventId,
      sourceTemplateId: globalTemplateId,
      name: "PCA Copy A",
    });
    const r2 = await cloneJudgingTemplateToEvent({
      eventId,
      sourceTemplateId: globalTemplateId,
      name: "PCA Copy B",
    });
    cleanup.eventTemplateIds.push(r1.eventTemplateId, r2.eventTemplateId);
    expect(r1.eventTemplateId).not.toBe(r2.eventTemplateId);
  });

  it("snapshots event template and isolates from later edits", async () => {
    const { eventTemplateId } = await cloneJudgingTemplateToEvent({
      eventId,
      sourceTemplateId: globalTemplateId,
      name: "Snapshot Test Template",
    });
    cleanup.eventTemplateIds.push(eventTemplateId);

    const sheet = await snapshotEventTemplateToScoreSheet({
      eventId,
      eventJudgingTemplateId: eventTemplateId,
      vehicleEntryCode: `${vehicleEntryCode}-snap-${Date.now()}`,
      registrationId,
      registrationVehicleId,
      judgeUserId,
    });
    cleanup.scoreSheetIds.push(sheet.id);

    const originalSectionName = sheet.sections[0]!.name;

    await prisma.eventJudgingSection.updateMany({
      where: { templateId: eventTemplateId },
      data: { name: "MUTATED SECTION NAME" },
    });

    const reloaded = await prisma.judgeScoreSheet.findUnique({
      where: { id: sheet.id },
      include: { sections: { orderBy: { sortOrder: "asc" } } },
    });
    expect(reloaded?.sections[0]!.name).toBe(originalSectionName);
    expect(reloaded?.sections[0]!.name).not.toBe("MUTATED SECTION NAME");
  });

  it("calculates DEDUCTION scores from snapshot rows", async () => {
    const additive = await prisma.judgingTemplate.findFirst({
      where: { slug: "modified-custom" },
    });
    const pca = await prisma.judgingTemplate.findFirst({ where: { slug: "pca" } });
    const marque = await prisma.judgingTemplate.findFirst({
      where: { slug: "marque-authenticity" },
    });
    expect(additive && pca && marque).toBeTruthy();

    const deductionResult = calculateScoreFromSnapshot({
      methodology: "DEDUCTION",
      totalPoints: 100,
      sections: [
        {
          weightPercent: null,
          maxSectionPoints: 50,
          items: [
            {
              maxPoints: 30,
              awardedPoints: null,
              deductions: [{ pointsDeducted: 5, deductionBucket: null }],
            },
          ],
        },
      ],
    });
    expect(deductionResult.finalScore).toBe(25);

    const additiveResult = calculateScoreFromSnapshot({
      methodology: "ADDITIVE",
      totalPoints: 700,
      sections: [
        {
          weightPercent: 50,
          maxSectionPoints: null,
          items: [
            {
              maxPoints: 150,
              awardedPoints: 100,
              deductions: [],
            },
          ],
        },
      ],
    });
    expect(additiveResult.finalScore).toBe(50);

    const originalityResult = calculateScoreFromSnapshot({
      methodology: "ORIGINALITY_CONDITION",
      totalPoints: 700,
      sections: [
        {
          weightPercent: null,
          maxSectionPoints: null,
          items: [
            {
              maxPoints: 200,
              awardedPoints: null,
              deductions: [
                { pointsDeducted: 30, deductionBucket: "ORIGINALITY" },
                { pointsDeducted: 20, deductionBucket: "CONDITION" },
              ],
            },
          ],
        },
      ],
    });
    expect(originalityResult.finalScore).toBe(650);
  });

  it("runs judge ballot create → open → vote → results flow", async () => {
    const category = await prisma.judgeBallotCategory.create({
      data: {
        eventId,
        name: `Phase1C Best Paint ${Date.now()}`,
        votesPerJudge: 5,
        maxVotesPerJudgePerVehicle: 2,
        eligibleClasses: { create: [{ eventCategoryId }] },
      },
    });
    cleanup.ballotCategoryIds.push(category.id);

    const { allocationCount } = await openJudgeBallotCategory(category.id);
    expect(allocationCount).toBeGreaterThan(0);

    const allocations = await prisma.judgeBallotAllocation.findMany({
      where: { categoryId: category.id },
    });
    expect(allocations.length).toBe(allocationCount);
    expect(allocations.every((a) => a.totalVotesAllocated === 5)).toBe(true);

    await upsertJudgeBallotVote({
      categoryId: category.id,
      judgeUserId,
      vehicleEntryCode,
      registrationId,
      registrationVehicleId,
      vehicleEventCategoryId: eventCategoryId,
      voteCount: 2,
    });

    const closedDraft = validateJudgeBallotVoteUpsert({
      category: {
        status: "DRAFT",
        votesPerJudge: 5,
        maxVotesPerJudgePerVehicle: 2,
        eligibleEventCategoryIds: [eventCategoryId],
      },
      vehicleEntryCode,
      vehicleEventCategoryId: eventCategoryId,
      proposedVoteCount: 1,
      existingVotes: [],
    });
    expect(closedDraft.ok).toBe(false);

    await expect(
      upsertJudgeBallotVote({
        categoryId: category.id,
        judgeUserId,
        vehicleEntryCode: "OTHER-999",
        registrationId,
        registrationVehicleId,
        vehicleEventCategoryId: "wrong-category-id",
        voteCount: 1,
      }),
    ).rejects.toThrow(/not eligible/i);

    const rv2 = await prisma.registrationVehicle.findFirst({
      where: {
        registration: { eventId },
        publicVehicleId: { not: vehicleEntryCode },
      },
      select: {
        publicVehicleId: true,
        registrationId: true,
        id: true,
        eventCategoryId: true,
      },
    });

    if (rv2?.publicVehicleId) {
      await upsertJudgeBallotVote({
        categoryId: category.id,
        judgeUserId,
        vehicleEntryCode: rv2.publicVehicleId,
        registrationId: rv2.registrationId,
        registrationVehicleId: rv2.id,
        vehicleEventCategoryId: rv2.eventCategoryId,
        voteCount: 2,
      });

      await expect(
        upsertJudgeBallotVote({
          categoryId: category.id,
          judgeUserId,
          vehicleEntryCode: rv2.publicVehicleId,
          registrationId: rv2.registrationId,
          registrationVehicleId: rv2.id,
          vehicleEventCategoryId: rv2.eventCategoryId,
          voteCount: 3,
        }),
      ).rejects.toThrow(/at most 2 vote/i);
    }

    await closeJudgeBallotCategory(category.id, "CLOSED");

    await expect(
      upsertJudgeBallotVote({
        categoryId: category.id,
        judgeUserId,
        vehicleEntryCode,
        registrationId,
        registrationVehicleId,
        vehicleEventCategoryId: eventCategoryId,
        voteCount: 1,
      }),
    ).rejects.toThrow(/closed/i);

    const results = await aggregateJudgeBallotResults(category.id);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.vehicleEntryCode).toBe(vehicleEntryCode);
    expect(results[0]!.totalVotes).toBe(2);
  });

  it("enforces category-specific judge assignment", async () => {
    const category = await prisma.judgeBallotCategory.create({
      data: {
        eventId,
        name: `Phase1C Assigned Judges ${Date.now()}`,
        votesPerJudge: 3,
        judgeAssignments: { create: [{ judgeUserId }] },
      },
    });
    cleanup.ballotCategoryIds.push(category.id);
    await openJudgeBallotCategory(category.id);

    await assertJudgeCanVoteInCategory(judgeUserId, category.id);

    if (nonJudgeUserId !== judgeUserId) {
      const roles = await getUserEventRoles(nonJudgeUserId, eventId);
      if (!roles.includes("JUDGE")) {
        await expect(
          assertJudgeCanVoteInCategory(nonJudgeUserId, category.id),
        ).rejects.toThrow(/not assigned to vote in this award category/i);
      }
    }
  });

  it("validates guest vehicle eligibility via eventCategoryId", () => {
    expect(
      isVehicleEligibleForBallotCategory(["cat-a"], "cat-a"),
    ).toBe(true);
    expect(
      isVehicleEligibleForBallotCategory(["cat-a"], null),
    ).toBe(false);
    expect(isVehicleEligibleForBallotCategory([], null)).toBe(true);
  });

  it("flags tied results correctly", async () => {
    const category = await prisma.judgeBallotCategory.create({
      data: {
        eventId,
        name: `Phase1C Tie Test ${Date.now()}`,
        votesPerJudge: 10,
        maxVotesPerJudgePerVehicle: 5,
        status: "OPEN",
      },
    });
    cleanup.ballotCategoryIds.push(category.id);
    await openJudgeBallotCategory(category.id);

    const rv2 = await prisma.registrationVehicle.findFirst({
      where: {
        registration: { eventId },
        publicVehicleId: { not: vehicleEntryCode },
      },
      select: { publicVehicleId: true, registrationId: true, id: true },
    });

    await upsertJudgeBallotVote({
      categoryId: category.id,
      judgeUserId,
      vehicleEntryCode,
      registrationId,
      registrationVehicleId,
      vehicleEventCategoryId: eventCategoryId,
      voteCount: 3,
    });

    if (rv2?.publicVehicleId) {
      await upsertJudgeBallotVote({
        categoryId: category.id,
        judgeUserId,
        vehicleEntryCode: rv2.publicVehicleId,
        registrationId: rv2.registrationId,
        registrationVehicleId: rv2.id,
        vehicleEventCategoryId: eventCategoryId,
        voteCount: 3,
      });
    }

    const results = await aggregateJudgeBallotResults(category.id);
    const tied = results.filter((r) => r.totalVotes === 3);
    if (tied.length >= 2) {
      expect(tied.every((r) => r.isTied)).toBe(true);
    }
  });
});

describe("Phase 1C compatibility (no DB)", () => {
  it("legacy judge score module imports", async () => {
    const mod = await import("@/lib/vehicle-judging");
    expect(typeof mod).toBe("object");
  });

  it("public vote validation module imports", async () => {
    const mod = await import("@/lib/validation/sms-voting");
    expect(mod).toBeTruthy();
  });

  it("vehicle entry lookup module imports", async () => {
    const mod = await import("@/lib/vehicle-entry-lookup");
    expect(typeof mod.findVehicleEntryByCode).toBe("function");
  });
});

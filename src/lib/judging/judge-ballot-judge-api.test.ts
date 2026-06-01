/**
 * Judge ballot API behavior — extends Phase 1C integration coverage.
 * Run: npm run test:judging-integration
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  assertJudgeCanAccessBallotCategory,
  loadJudgeBallotCategoriesForEvent,
  loadJudgeBallotCategoryDetail,
} from "@/lib/judging/judge-ballot-judge-data";
import { upsertJudgeBallotVote } from "@/lib/judging/upsert-judge-ballot-vote";
import {
  closeJudgeBallotCategory,
  openJudgeBallotCategory,
  listEventJudgeUserIds,
} from "@/lib/judging/judge-ballot-allocation";

const prisma = new PrismaClient();
const RUN = process.env.JUDGING_INTEGRATION_TESTS === "1" || !!process.env.DATABASE_URL;

const cleanup = { ballotCategoryIds: [] as string[] };

describe.skipIf(!RUN)("Phase 2C judge ballot judge API", () => {
  let eventId: string;
  let judgeUserId: string;
  let nonJudgeUserId: string;
  let eventCategoryId: string;
  let registrationId: string;
  let registrationVehicleId: string;
  let vehicleEntryCode: string;

  beforeAll(async () => {
    const event = await prisma.event.findFirst({
      where: { status: { in: ["DRAFT", "PUBLISHED", "ACTIVE"] } },
      orderBy: { updatedAt: "desc" },
    });
    if (!event) throw new Error("No event for tests.");
    eventId = event.id;

    judgeUserId = (await listEventJudgeUserIds(eventId))[0] ?? "";
    if (!judgeUserId) {
      const u = await prisma.user.findFirst({ where: { status: "ACTIVE" } });
      if (!u) throw new Error("No user.");
      judgeUserId = u.id;
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
            staffMemberId_roleId: {
              staffMemberId: staff.id,
              roleId: role.id,
            },
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
        })
      )?.id ?? judgeUserId;

    const ec = await prisma.eventCategory.findFirst({ where: { eventId } });
    if (!ec) throw new Error("Need event category.");
    eventCategoryId = ec.id;

    const rv = await prisma.registrationVehicle.findFirst({
      where: { registration: { eventId }, publicVehicleId: { not: null } },
    });
    if (!rv?.publicVehicleId) throw new Error("Need vehicle entry code.");
    registrationVehicleId = rv.id;
    registrationId = rv.registrationId;
    vehicleEntryCode = rv.publicVehicleId;
  });

  afterAll(async () => {
    if (!RUN) return;
    for (const id of cleanup.ballotCategoryIds) {
      await prisma.judgeBallotVote.deleteMany({ where: { categoryId: id } });
      await prisma.judgeBallotAllocation.deleteMany({ where: { categoryId: id } });
      await prisma.judgeBallotEligibleClass.deleteMany({ where: { categoryId: id } });
      await prisma.judgeBallotCategoryJudge.deleteMany({ where: { categoryId: id } });
      await prisma.judgeBallotCategory.deleteMany({ where: { id } });
    }
    await prisma.$disconnect();
  });

  it("judge loads eligible OPEN categories only (not DRAFT)", async () => {
    const draft = await prisma.judgeBallotCategory.create({
      data: {
        eventId,
        name: `2C Draft Hidden ${Date.now()}`,
        votesPerJudge: 3,
        status: "DRAFT",
      },
    });
    const open = await prisma.judgeBallotCategory.create({
      data: {
        eventId,
        name: `2C Open Visible ${Date.now()}`,
        votesPerJudge: 3,
        status: "DRAFT",
      },
    });
    cleanup.ballotCategoryIds.push(draft.id, open.id);
    await openJudgeBallotCategory(open.id);

    const list = await loadJudgeBallotCategoriesForEvent(judgeUserId, eventId);
    expect(list.some((c) => c.id === open.id)).toBe(true);
    expect(list.some((c) => c.id === draft.id)).toBe(false);
  });

  it("judge can submit a valid vote and load category detail", async () => {
    const cat = await prisma.judgeBallotCategory.create({
      data: {
        eventId,
        name: `2C Vote Test ${Date.now()}`,
        votesPerJudge: 5,
        maxVotesPerJudgePerVehicle: 2,
      },
    });
    cleanup.ballotCategoryIds.push(cat.id);
    await openJudgeBallotCategory(cat.id);

    await upsertJudgeBallotVote({
      categoryId: cat.id,
      judgeUserId,
      vehicleEntryCode,
      registrationId,
      registrationVehicleId,
      vehicleEventCategoryId: eventCategoryId,
      voteCount: 2,
    });

    const detail = await loadJudgeBallotCategoryDetail(
      judgeUserId,
      eventId,
      cat.id,
    );
    expect(detail.allocation.votesUsed).toBe(2);
    expect(detail.allocation.votesRemaining).toBe(3);
    expect(detail.votes.some((v) => v.vehicleEntryCode === vehicleEntryCode)).toBe(
      true,
    );
    expect(detail.canEdit).toBe(true);
  });

  it("blocks vote over allocation and per-vehicle max", async () => {
    const cat = await prisma.judgeBallotCategory.create({
      data: {
        eventId,
        name: `2C Limits ${Date.now()}`,
        votesPerJudge: 3,
        maxVotesPerJudgePerVehicle: 1,
      },
    });
    cleanup.ballotCategoryIds.push(cat.id);
    await openJudgeBallotCategory(cat.id);

    await expect(
      upsertJudgeBallotVote({
        categoryId: cat.id,
        judgeUserId,
        vehicleEntryCode,
        registrationId,
        registrationVehicleId,
        vehicleEventCategoryId: eventCategoryId,
        voteCount: 2,
      }),
    ).rejects.toThrow(/at most 1 vote/i);
  });

  it("blocks voting when category is closed or finalized", async () => {
    const cat = await prisma.judgeBallotCategory.create({
      data: {
        eventId,
        name: `2C Closed ${Date.now()}`,
        votesPerJudge: 3,
        status: "OPEN",
      },
    });
    cleanup.ballotCategoryIds.push(cat.id);
    await openJudgeBallotCategory(cat.id);
    await closeJudgeBallotCategory(cat.id, "CLOSED");

    await expect(
      upsertJudgeBallotVote({
        categoryId: cat.id,
        judgeUserId,
        vehicleEntryCode,
        registrationId,
        registrationVehicleId,
        vehicleEventCategoryId: eventCategoryId,
        voteCount: 1,
      }),
    ).rejects.toThrow(/closed/i);

    const detail = await loadJudgeBallotCategoryDetail(
      judgeUserId,
      eventId,
      cat.id,
    );
    expect(detail.canEdit).toBe(false);
  });

  it("blocks non-assigned judge on category-specific assignment", async () => {
    if (nonJudgeUserId === judgeUserId) return;

    const cat = await prisma.judgeBallotCategory.create({
      data: {
        eventId,
        name: `2C Assigned Only ${Date.now()}`,
        votesPerJudge: 3,
        judgeAssignments: { create: [{ judgeUserId }] },
      },
    });
    cleanup.ballotCategoryIds.push(cat.id);
    await openJudgeBallotCategory(cat.id);

    const roles = await import("@/lib/event-staff").then((m) =>
      m.getUserEventRoles(nonJudgeUserId, eventId),
    );
    if (roles.includes("JUDGE")) {
      await expect(
        assertJudgeCanAccessBallotCategory(nonJudgeUserId, cat.id),
      ).rejects.toThrow(/not assigned/i);
    }
  });

  it("blocks ineligible vehicle class", async () => {
    const otherClass = await prisma.eventCategory.findFirst({
      where: { eventId, id: { not: eventCategoryId } },
    });
    if (!otherClass) return;

    const cat = await prisma.judgeBallotCategory.create({
      data: {
        eventId,
        name: `2C Eligibility ${Date.now()}`,
        votesPerJudge: 3,
        eligibleClasses: { create: [{ eventCategoryId: otherClass.id }] },
      },
    });
    cleanup.ballotCategoryIds.push(cat.id);
    await openJudgeBallotCategory(cat.id);

    await expect(
      upsertJudgeBallotVote({
        categoryId: cat.id,
        judgeUserId,
        vehicleEntryCode,
        registrationId,
        registrationVehicleId,
        vehicleEventCategoryId: eventCategoryId,
        voteCount: 1,
      }),
    ).rejects.toThrow(/not eligible/i);
  });
});

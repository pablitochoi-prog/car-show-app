import { prisma } from "@/lib/db";
import { getUserEventRoles } from "@/lib/event-staff";
import { findVehicleEntryByCode } from "@/lib/vehicle-entry-lookup";
import {
  MAX_BALLOT_CATEGORIES_PER_VEHICLE,
  userCanVoteInBallotCategory,
  userHasBallotStaffRole,
} from "@/lib/judging/judge-ballot-authorization";
import {
  canEditBallotVotes,
  isVehicleEligibleForBallotCategory,
} from "@/lib/judging/judge-ballot-validation";
import { recomputeJudgeBallotAllocationUsage } from "@/lib/judging/judge-ballot-allocation";
import { upsertJudgeBallotVote } from "@/lib/judging/upsert-judge-ballot-vote";
import {
  JudgeBallotAccessError,
  assertJudgeBallotEventAccess,
} from "@/lib/judging/judge-ballot-judge-data";

export type VehicleBallotCategoryOption = {
  categoryId: string;
  name: string;
  status: string;
  votesRemaining: number;
  canEdit: boolean;
  existingStarRating: number | null;
  existingStatus: "DRAFT" | "SUBMITTED" | null;
};

export type VehicleBallotVehicleHeader = {
  vehicleEntryCode: string;
  photoUrl: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  nickname: string | null;
  ownerLabel: string | null;
  classLabel: string;
};

export type VehicleBallotPageData = {
  vehicle: VehicleBallotVehicleHeader;
  categories: VehicleBallotCategoryOption[];
  maxCategoriesPerVehicle: number;
};

export type VehicleBallotSelection = {
  categoryId: string;
  starRating: number;
};

async function ownerLabelForRegistration(
  registrationId: string,
): Promise<string | null> {
  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      user: { select: { firstName: true, lastName: true, email: true } },
      guestFirstName: true,
      guestLastName: true,
      guestEmail: true,
    },
  });
  if (!reg) return null;
  if (reg.user) {
    const name = [reg.user.firstName, reg.user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    return name || reg.user.email;
  }
  const guest = [reg.guestFirstName, reg.guestLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return guest || reg.guestEmail || null;
}

export async function loadVehicleBallotPage(
  judgeUserId: string,
  eventId: string,
  vehicleEntryCode: string,
): Promise<VehicleBallotPageData> {
  await assertJudgeBallotEventAccess(judgeUserId, eventId);

  const entry = await findVehicleEntryByCode(vehicleEntryCode);
  if (!entry || entry.eventId !== eventId) {
    throw new JudgeBallotAccessError(
      "VEHICLE_NOT_FOUND",
      "Vehicle ID not found for this event.",
    );
  }

  const roles = await getUserEventRoles(judgeUserId, eventId);

  const categories = await prisma.judgeBallotCategory.findMany({
    where: {
      eventId,
      isActive: true,
      status: { not: "DRAFT" },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      eligibleClasses: { select: { eventCategoryId: true } },
      judgeAssignments: { select: { judgeUserId: true } },
      specialJudgeAssignments: { select: { judgeUserId: true } },
      allocations: {
        where: { judgeUserId },
        select: { votesUsed: true, totalVotesAllocated: true },
      },
      votes: {
        where: { judgeUserId, vehicleEntryCode: entry.vehicleEntryCode },
        select: { categoryId: true, starRating: true, status: true, voteCount: true },
      },
    },
  });

  const options: VehicleBallotCategoryOption[] = [];

  for (const cat of categories) {
    const auth = {
      requiresSpecialJudge: cat.requiresSpecialJudge,
      assignedJudgeUserIds: cat.judgeAssignments.map((a) => a.judgeUserId),
      specialJudgeUserIds: cat.specialJudgeAssignments.map((a) => a.judgeUserId),
    };
    if (!userCanVoteInBallotCategory(roles, judgeUserId, auth)) continue;

    const eligibleIds = cat.eligibleClasses.map((c) => c.eventCategoryId);
    if (
      !isVehicleEligibleForBallotCategory(eligibleIds, entry.eventCategoryId)
    ) {
      continue;
    }

    const allocation = cat.allocations[0];
    const votesUsed = allocation?.votesUsed ?? 0;
    const total = allocation?.totalVotesAllocated ?? cat.votesPerJudge;
    const existing = cat.votes[0];

    options.push({
      categoryId: cat.id,
      name: cat.name,
      status: cat.status,
      votesRemaining: Math.max(0, total - votesUsed),
      canEdit: canEditBallotVotes(cat.status),
      existingStarRating: existing?.starRating ?? null,
      existingStatus: existing?.status ?? null,
    });
  }

  const ownerLabel = await ownerLabelForRegistration(entry.registrationId);

  return {
    vehicle: {
      vehicleEntryCode: entry.vehicleEntryCode,
      photoUrl: entry.photoUrl,
      year: entry.year,
      make: entry.make,
      model: entry.model,
      trim: entry.trim,
      nickname: entry.nickname,
      ownerLabel,
      classLabel: entry.classLabel,
    },
    categories: options,
    maxCategoriesPerVehicle: MAX_BALLOT_CATEGORIES_PER_VEHICLE,
  };
}

export async function saveVehicleBallotVotes(
  judgeUserId: string,
  eventId: string,
  vehicleEntryCode: string,
  action: "draft" | "submit",
  selections: VehicleBallotSelection[],
): Promise<{ saved: number }> {
  if (!userHasBallotStaffRole(await getUserEventRoles(judgeUserId, eventId))) {
    throw new JudgeBallotAccessError(
      "NOT_AUTHORIZED",
      "You do not have ballot access for this event.",
    );
  }

  if (selections.length > MAX_BALLOT_CATEGORIES_PER_VEHICLE) {
    const err = new Error(
      "You can select up to 5 award categories for this vehicle.",
    );
    (err as Error & { code: string }).code = "MAX_CATEGORIES";
    throw err;
  }

  const entry = await findVehicleEntryByCode(vehicleEntryCode);
  if (!entry || entry.eventId !== eventId) {
    throw new JudgeBallotAccessError(
      "VEHICLE_NOT_FOUND",
      "Vehicle ID not found for this event.",
    );
  }

  if (action === "submit" && selections.length === 0) {
    throw new Error("Select at least one award category to submit.");
  }

  const status = action === "draft" ? "DRAFT" : "SUBMITTED";
  const voteCount = action === "submit" ? 1 : 0;

  if (action === "submit") {
    const selectedIds = selections.map((s) => s.categoryId);
    const cleared = await prisma.judgeBallotVote.findMany({
      where: {
        eventId,
        judgeUserId,
        vehicleEntryCode: entry.vehicleEntryCode,
        categoryId: { notIn: selectedIds },
        category: { status: "OPEN" },
      },
      select: { categoryId: true },
    });
    if (cleared.length > 0) {
      await prisma.judgeBallotVote.deleteMany({
        where: {
          eventId,
          judgeUserId,
          vehicleEntryCode: entry.vehicleEntryCode,
          categoryId: { in: cleared.map((c) => c.categoryId) },
        },
      });
      for (const { categoryId } of cleared) {
        await recomputeJudgeBallotAllocationUsage(categoryId, judgeUserId);
      }
    }
  }

  let saved = 0;
  for (const sel of selections) {
    if (
      !Number.isInteger(sel.starRating) ||
      sel.starRating < 1 ||
      sel.starRating > 5
    ) {
      throw new Error("Star rating must be between 1 and 5.");
    }

    await upsertJudgeBallotVote({
      categoryId: sel.categoryId,
      judgeUserId,
      vehicleEntryCode: entry.vehicleEntryCode,
      registrationId: entry.registrationId,
      registrationVehicleId: entry.registrationVehicleId,
      vehicleEventCategoryId: entry.eventCategoryId,
      voteCount,
      starRating: sel.starRating,
      status,
    });
    saved += 1;
  }

  return { saved };
}

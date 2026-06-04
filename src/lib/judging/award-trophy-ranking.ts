import { prisma } from "@/lib/db";
import { registrationVehicleStaffPhotoViewPath } from "@/lib/event-registration-staff-photos";
import { resolveRegistrationContact } from "@/lib/registration-contact";
import { aggregateJudgeBallotResults } from "@/lib/judging/judge-ballot-results";
import { aggregateScoreSheetResults } from "@/lib/judging/score-sheet-results";
import { loadEventVotingTabulation } from "@/lib/event-reports/voting-tabulation";
import {
  normalizeAwardNameForMatch,
  TROPHY_WINNERS_LIST_SIZE,
} from "@/lib/judging/award-trophy-match";

export { TROPHY_WINNERS_LIST_SIZE } from "@/lib/judging/award-trophy-match";

export type TrophyWinnerRankingSource =
  | "score_sheet"
  | "judge_ballot"
  | "public_vote"
  | "unconfigured";

export type RankedTrophyVehicle = {
  listPosition: number;
  rank: number;
  vehicleEntryCode: string;
  vehicleNickname: string | null;
  ownerName: string | null;
  year: number;
  make: string;
  model: string;
  vehicleClass: string;
  photoUrl: string | null;
  metricLabel: string;
  metricValue: number | null;
};

type RawRankRow = Omit<RankedTrophyVehicle, "listPosition" | "ownerName" | "photoUrl">;

function sliceTop(rows: RawRankRow[]): RawRankRow[] {
  return rows.slice(0, TROPHY_WINNERS_LIST_SIZE);
}

async function loadEntryCodesInCategory(
  eventId: string,
  eventCategoryId: string,
): Promise<Set<string>> {
  const rows = await prisma.registrationVehicle.findMany({
    where: {
      registration: { eventId },
      eventCategoryId,
      publicVehicleId: { not: null },
    },
    select: { publicVehicleId: true },
  });
  return new Set(
    rows
      .map((r) => r.publicVehicleId)
      .filter((code): code is string => !!code),
  );
}

/** Resolve judging class for a registration category (direct link or fallbacks). */
export async function findJudgingClassIdForCategory(
  eventId: string,
  eventCategoryId: string,
): Promise<string | null> {
  const direct = await prisma.eventJudgingClassEligibleCategory.findFirst({
    where: { eventCategoryId },
    select: {
      eventJudgingClass: { select: { id: true, eventId: true } },
    },
  });
  if (direct?.eventJudgingClass.eventId === eventId) {
    return direct.eventJudgingClass.id;
  }

  const viaEligible = await prisma.eventJudgingClass.findFirst({
    where: {
      eventId,
      eligibleCategories: { some: { eventCategoryId } },
    },
    select: { id: true },
    orderBy: { sortOrder: "asc" },
  });
  if (viaEligible) return viaEligible.id;

  const category = await prisma.eventCategory.findUnique({
    where: { id: eventCategoryId },
    select: {
      customName: true,
      category: { select: { name: true } },
    },
  });
  const categoryLabel =
    category?.customName?.trim() || category?.category?.name || "";
  if (categoryLabel) {
    const target = normalizeAwardNameForMatch(categoryLabel);
    const classes = await prisma.eventJudgingClass.findMany({
      where: { eventId },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    });
    const match = classes.find(
      (c) => normalizeAwardNameForMatch(c.name) === target,
    );
    if (match) return match.id;
  }

  const codes = [...(await loadEntryCodesInCategory(eventId, eventCategoryId))];
  if (codes.length === 0) return null;

  const grouped = await prisma.judgeScoreSheet.groupBy({
    by: ["eventJudgingClassId"],
    where: {
      eventId,
      vehicleEntryCode: { in: codes },
      eventJudgingClassId: { not: null },
      status: { in: ["SUBMITTED", "FINALIZED"] },
    },
    _count: { _all: true },
  });

  let bestId: string | null = null;
  let bestCount = 0;
  for (const row of grouped) {
    if (row.eventJudgingClassId && row._count._all > bestCount) {
      bestCount = row._count._all;
      bestId = row.eventJudgingClassId;
    }
  }
  return bestId;
}

export async function enrichRankedVehicles(
  eventId: string,
  rows: RawRankRow[],
): Promise<RankedTrophyVehicle[]> {
  const codes = rows.map((r) => r.vehicleEntryCode);
  if (codes.length === 0) return [];

  const regVehicles = await prisma.registrationVehicle.findMany({
    where: {
      registration: { eventId },
      publicVehicleId: { in: codes },
    },
    select: {
      id: true,
      registrationId: true,
      publicVehicleId: true,
      vehicleNickname: true,
      eventPhotoObjectKey: true,
      vehicle: { select: { nickname: true, photoUrl: true } },
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
              name: true,
              email: true,
              phone: true,
              firstName: true,
              lastName: true,
              status: true,
            },
          },
        },
      },
    },
  });

  const byCode = new Map(
    regVehicles
      .filter((rv) => rv.publicVehicleId)
      .map((rv) => [rv.publicVehicleId as string, rv]),
  );

  return rows.map((row, index) => {
    const rv = byCode.get(row.vehicleEntryCode);
    let photoUrl: string | null = null;
    if (rv?.eventPhotoObjectKey) {
      photoUrl = registrationVehicleStaffPhotoViewPath(
        eventId,
        rv.registrationId,
        rv.id,
      );
    } else {
      const legacy = rv?.vehicle.photoUrl?.trim();
      if (legacy?.startsWith("http")) {
        photoUrl = legacy;
      } else if (row.vehicleEntryCode) {
        photoUrl = `/api/v/${encodeURIComponent(row.vehicleEntryCode)}/photo`;
      }
    }

    const ownerName = rv
      ? resolveRegistrationContact(rv.registration).name
      : null;

    return {
      ...row,
      listPosition: index + 1,
      vehicleNickname:
        row.vehicleNickname?.trim() ||
        rv?.vehicleNickname?.trim() ||
        rv?.vehicle.nickname?.trim() ||
        null,
      ownerName,
      photoUrl,
    };
  });
}

export async function rankCategoryAwardPool(
  eventId: string,
  eventCategoryId: string,
): Promise<{ vehicles: RankedTrophyVehicle[]; source: TrophyWinnerRankingSource }> {
  const judgingClassId = await findJudgingClassIdForCategory(
    eventId,
    eventCategoryId,
  );
  if (!judgingClassId) {
    return { vehicles: [], source: "unconfigured" };
  }

  const results = await aggregateScoreSheetResults(eventId, judgingClassId, {
    includeOwnerNames: true,
  });
  if (!results || results.ranked.length === 0) {
    return { vehicles: [], source: "unconfigured" };
  }

  const inCategory = await loadEntryCodesInCategory(eventId, eventCategoryId);
  const ranked = results.ranked
    .filter((row) => {
      if (inCategory.size === 0) return true;
      return inCategory.has(row.vehicleEntryCode);
    })
    .sort((a, b) => (b.officialScore ?? 0) - (a.officialScore ?? 0));

  const raw = sliceTop(
    ranked.map((row) => ({
      rank: row.rank ?? 0,
      vehicleEntryCode: row.vehicleEntryCode,
      vehicleNickname: row.vehicleNickname,
      year: row.year,
      make: row.make,
      model: row.model,
      vehicleClass: row.vehicleClass,
      metricLabel: "Score",
      metricValue: row.officialScore,
    })),
  );

  const vehicles = await enrichRankedVehicles(eventId, raw);
  return { vehicles, source: "score_sheet" };
}

async function findBallotCategoryIdByAwardName(
  eventId: string,
  awardName: string,
): Promise<string | null> {
  const target = normalizeAwardNameForMatch(awardName);
  const categories = await prisma.judgeBallotCategory.findMany({
    where: { eventId },
    select: { id: true, name: true },
  });
  return (
    categories.find((c) => normalizeAwardNameForMatch(c.name) === target)?.id ??
    null
  );
}

async function findVotingCategoryIdByAwardName(
  eventId: string,
  awardName: string,
): Promise<string | null> {
  const target = normalizeAwardNameForMatch(awardName);
  const categories = await prisma.votingCategory.findMany({
    where: { eventId, isActive: true },
    select: { id: true, name: true },
  });
  return (
    categories.find((c) => normalizeAwardNameForMatch(c.name) === target)?.id ??
    null
  );
}

export async function rankSpecialAwardPool(
  eventId: string,
  awardName: string,
): Promise<{ vehicles: RankedTrophyVehicle[]; source: TrophyWinnerRankingSource }> {
  const ballotCategoryId = await findBallotCategoryIdByAwardName(
    eventId,
    awardName,
  );
  if (ballotCategoryId) {
    const ranked = await aggregateJudgeBallotResults(ballotCategoryId);
    const raw = sliceTop(
      ranked.map((row) => ({
        rank: row.rank,
        vehicleEntryCode: row.vehicleEntryCode,
        vehicleNickname: row.vehicleNickname,
        year: row.year,
        make: row.make,
        model: row.model,
        vehicleClass: row.vehicleClass,
        metricLabel: "Votes",
        metricValue: row.totalVotes,
      })),
    );
    return {
      vehicles: await enrichRankedVehicles(eventId, raw),
      source: "judge_ballot",
    };
  }

  const votingCategoryId = await findVotingCategoryIdByAwardName(
    eventId,
    awardName,
  );
  if (votingCategoryId) {
    const tabulation = await loadEventVotingTabulation(eventId);
    const cat = tabulation.categories.find((c) => c.categoryId === votingCategoryId);
    if (cat) {
      const raw = sliceTop(
        cat.rows.map((row) => ({
          rank: row.rank,
          vehicleEntryCode: row.vehicleEntryCode,
          vehicleNickname: null,
          year: 0,
          make: row.vehicleLabel,
          model: "",
          vehicleClass: "—",
          metricLabel: "Votes",
          metricValue: row.totalVotes,
        })),
      );
      return {
        vehicles: await enrichRankedVehicles(eventId, raw),
        source: "public_vote",
      };
    }
  }

  return { vehicles: [], source: "unconfigured" };
}

export { pickAutoWinnerForPlace } from "@/lib/judging/award-trophy-place-pick";

import type { JudgeScoreSheetStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { registrationVehicleStaffPhotoViewPath } from "@/lib/event-registration-staff-photos";
import { loadEventVotingTabulation } from "@/lib/event-reports/voting-tabulation";
import type { EventVotingTabulation } from "@/lib/event-reports/voting-tabulation";
import { aggregateJudgeBallotResultsForEvent } from "@/lib/judging/judge-ballot-results";
import type { JudgeBallotResultRow } from "@/lib/judging/judge-ballot-results";
import {
  normalizeAwardNameForMatch,
  TROPHY_WINNERS_LIST_SIZE,
} from "@/lib/judging/award-trophy-match";
import type {
  RankedTrophyVehicle,
  TrophyWinnerRankingSource,
} from "@/lib/judging/award-trophy-ranking";
import {
  aggregateScoreSheetResults,
  type ScoreSheetClassResults,
} from "@/lib/judging/score-sheet-results";
import { resolveRegistrationContact } from "@/lib/registration-contact";

const SCORING_STATUSES: JudgeScoreSheetStatus[] = ["SUBMITTED", "FINALIZED"];

type RawRankRow = Omit<
  RankedTrophyVehicle,
  "listPosition" | "ownerName" | "photoUrl"
>;

export type AwardTrophyRankingCache = {
  judgingClassByCategoryId: Map<string, string | null>;
  entryCodesByCategoryId: Map<string, Set<string>>;
  scoreSheetResultsByClassId: Map<string, ScoreSheetClassResults | null>;
  ballotResultsByCategoryId: Map<string, JudgeBallotResultRow[]>;
  ballotCategoryIdByNormName: Map<string, string>;
  votingCategoryIdByNormName: Map<string, string>;
  votingTabulation: EventVotingTabulation;
  enrichRanked: (rows: RawRankRow[]) => RankedTrophyVehicle[];
};

function sliceTop(rows: RawRankRow[]): RawRankRow[] {
  return rows.slice(0, TROPHY_WINNERS_LIST_SIZE);
}

function buildEntryCodesByCategory(
  rows: Array<{ publicVehicleId: string | null; eventCategoryId: string | null }>,
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    const code = row.publicVehicleId?.trim();
    if (!code || !row.eventCategoryId) continue;
    let bucket = map.get(row.eventCategoryId);
    if (!bucket) {
      bucket = new Set();
      map.set(row.eventCategoryId, bucket);
    }
    bucket.add(code);
  }
  return map;
}

function resolveJudgingClassByCategory(
  eventCategories: Array<{
    id: string;
    customName: string | null;
    category: { name: string } | null;
  }>,
  judgingClasses: Array<{ id: string; name: string }>,
  eligibleLinks: Array<{ eventCategoryId: string; eventJudgingClassId: string }>,
): Map<string, string | null> {
  const map = new Map<string, string | null>();
  const directByCategory = new Map(
    eligibleLinks.map((link) => [link.eventCategoryId, link.eventJudgingClassId]),
  );
  const classByNormName = new Map(
    judgingClasses.map((row) => [normalizeAwardNameForMatch(row.name), row.id]),
  );

  for (const category of eventCategories) {
    const direct = directByCategory.get(category.id);
    if (direct) {
      map.set(category.id, direct);
      continue;
    }

    const label =
      category.customName?.trim() || category.category?.name?.trim() || "";
    if (label) {
      const matched = classByNormName.get(normalizeAwardNameForMatch(label));
      if (matched) {
        map.set(category.id, matched);
        continue;
      }
    }

    map.set(category.id, null);
  }

  return map;
}

async function fillJudgingClassFallbacks(
  eventId: string,
  judgingClassByCategoryId: Map<string, string | null>,
  entryCodesByCategoryId: Map<string, Set<string>>,
): Promise<void> {
  const pendingCategoryIds = [...judgingClassByCategoryId.entries()]
    .filter(([, classId]) => classId == null)
    .map(([categoryId]) => categoryId);
  if (pendingCategoryIds.length === 0) return;

  const codes = new Set<string>();
  for (const categoryId of pendingCategoryIds) {
    for (const code of entryCodesByCategoryId.get(categoryId) ?? []) {
      codes.add(code);
    }
  }
  if (codes.size === 0) return;

  const sheets = await prisma.judgeScoreSheet.findMany({
    where: {
      eventId,
      vehicleEntryCode: { in: [...codes] },
      eventJudgingClassId: { not: null },
      status: { in: SCORING_STATUSES },
    },
    select: { vehicleEntryCode: true, eventJudgingClassId: true },
  });

  const classCountsByCategory = new Map<string, Map<string, number>>();
  for (const categoryId of pendingCategoryIds) {
    classCountsByCategory.set(categoryId, new Map());
  }

  for (const sheet of sheets) {
    if (!sheet.eventJudgingClassId) continue;
    for (const categoryId of pendingCategoryIds) {
      const categoryCodes = entryCodesByCategoryId.get(categoryId);
      if (!categoryCodes?.has(sheet.vehicleEntryCode)) continue;
      const counts = classCountsByCategory.get(categoryId)!;
      counts.set(
        sheet.eventJudgingClassId,
        (counts.get(sheet.eventJudgingClassId) ?? 0) + 1,
      );
    }
  }

  for (const categoryId of pendingCategoryIds) {
    const counts = classCountsByCategory.get(categoryId);
    if (!counts || counts.size === 0) continue;

    let bestId: string | null = null;
    let bestCount = 0;
    for (const [classId, count] of counts) {
      if (count > bestCount) {
        bestCount = count;
        bestId = classId;
      }
    }
    if (bestId) judgingClassByCategoryId.set(categoryId, bestId);
  }
}

type CachedRegVehicle = {
  id: string;
  registrationId: string;
  publicVehicleId: string | null;
  vehicleNickname: string | null;
  eventPhotoObjectKey: string | null;
  vehicle: { nickname: string | null; photoUrl: string | null };
  registration: Parameters<typeof resolveRegistrationContact>[0];
};

function enrichRowsFromMap(
  eventId: string,
  rows: RawRankRow[],
  regVehicleByCode: Map<string, CachedRegVehicle>,
): RankedTrophyVehicle[] {
  return rows.map((row, index) => {
    const rv = regVehicleByCode.get(row.vehicleEntryCode);
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

/** Preload ranking inputs once per event (reports + trophy winners UI). */
export async function createAwardTrophyRankingCache(
  eventId: string,
): Promise<AwardTrophyRankingCache> {
  const [
    judgingClasses,
    eligibleLinks,
    eventCategories,
    entryCodeRows,
    ballotCategories,
    votingCategories,
    regVehicles,
    votingTabulation,
  ] = await Promise.all([
    prisma.eventJudgingClass.findMany({
      where: { eventId },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.eventJudgingClassEligibleCategory.findMany({
      where: { eventJudgingClass: { eventId } },
      select: { eventCategoryId: true, eventJudgingClassId: true },
    }),
    prisma.eventCategory.findMany({
      where: { eventId },
      select: {
        id: true,
        customName: true,
        category: { select: { name: true } },
      },
    }),
    prisma.registrationVehicle.findMany({
      where: {
        registration: { eventId },
        publicVehicleId: { not: null },
      },
      select: { publicVehicleId: true, eventCategoryId: true },
    }),
    prisma.judgeBallotCategory.findMany({
      where: { eventId },
      select: { id: true, name: true },
    }),
    prisma.votingCategory.findMany({
      where: { eventId, isActive: true },
      select: { id: true, name: true },
    }),
    prisma.registrationVehicle.findMany({
      where: {
        registration: { eventId },
        publicVehicleId: { not: null },
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
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                status: true,
              },
            },
          },
        },
      },
    }),
    loadEventVotingTabulation(eventId),
  ]);

  const entryCodesByCategoryId = buildEntryCodesByCategory(entryCodeRows);
  const judgingClassByCategoryId = resolveJudgingClassByCategory(
    eventCategories,
    judgingClasses,
    eligibleLinks,
  );
  await fillJudgingClassFallbacks(
    eventId,
    judgingClassByCategoryId,
    entryCodesByCategoryId,
  );

  const uniqueJudgingClassIds = [
    ...new Set(
      [...judgingClassByCategoryId.values()].filter(
        (classId): classId is string => classId != null,
      ),
    ),
  ];

  const scoreSheetResults = await Promise.all(
    uniqueJudgingClassIds.map((judgingClassId) =>
      aggregateScoreSheetResults(eventId, judgingClassId, {
        includeOwnerNames: true,
      }),
    ),
  );
  const scoreSheetResultsByClassId = new Map(
    uniqueJudgingClassIds.map((judgingClassId, index) => [
      judgingClassId,
      scoreSheetResults[index] ?? null,
    ]),
  );

  const ballotResultsByCategoryId = await aggregateJudgeBallotResultsForEvent(
    eventId,
    ballotCategories.map((category) => category.id),
  );

  const regVehicleByCode = new Map<string, CachedRegVehicle>(
    regVehicles
      .filter((row) => row.publicVehicleId)
      .map((row) => [row.publicVehicleId as string, row as CachedRegVehicle]),
  );

  return {
    judgingClassByCategoryId,
    entryCodesByCategoryId,
    scoreSheetResultsByClassId,
    ballotResultsByCategoryId,
    ballotCategoryIdByNormName: new Map(
      ballotCategories.map((category) => [
        normalizeAwardNameForMatch(category.name),
        category.id,
      ]),
    ),
    votingCategoryIdByNormName: new Map(
      votingCategories.map((category) => [
        normalizeAwardNameForMatch(category.name),
        category.id,
      ]),
    ),
    votingTabulation,
    enrichRanked: (rows) => enrichRowsFromMap(eventId, rows, regVehicleByCode),
  };
}

export function rankCategoryAwardPoolFromCache(
  cache: AwardTrophyRankingCache,
  eventCategoryId: string,
): { vehicles: RankedTrophyVehicle[]; source: TrophyWinnerRankingSource } {
  const judgingClassId =
    cache.judgingClassByCategoryId.get(eventCategoryId) ?? null;
  if (!judgingClassId) {
    return { vehicles: [], source: "unconfigured" };
  }

  const results = cache.scoreSheetResultsByClassId.get(judgingClassId);
  if (!results || results.ranked.length === 0) {
    return { vehicles: [], source: "unconfigured" };
  }

  const inCategory = cache.entryCodesByCategoryId.get(eventCategoryId) ?? new Set();
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

  return {
    vehicles: cache.enrichRanked(raw),
    source: "score_sheet",
  };
}

export function rankSpecialAwardPoolFromCache(
  cache: AwardTrophyRankingCache,
  awardName: string,
): { vehicles: RankedTrophyVehicle[]; source: TrophyWinnerRankingSource } {
  const ballotCategoryId = cache.ballotCategoryIdByNormName.get(
    normalizeAwardNameForMatch(awardName),
  );
  if (ballotCategoryId) {
    const ranked = cache.ballotResultsByCategoryId.get(ballotCategoryId) ?? [];
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
      vehicles: cache.enrichRanked(raw),
      source: "judge_ballot",
    };
  }

  const votingCategoryId = cache.votingCategoryIdByNormName.get(
    normalizeAwardNameForMatch(awardName),
  );
  if (votingCategoryId) {
    const category = cache.votingTabulation.categories.find(
      (row) => row.categoryId === votingCategoryId,
    );
    if (category) {
      const raw = sliceTop(
        category.rows.map((row) => ({
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
        vehicles: cache.enrichRanked(raw),
        source: "public_vote",
      };
    }
  }

  return { vehicles: [], source: "unconfigured" };
}

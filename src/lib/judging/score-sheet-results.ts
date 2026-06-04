import type { JudgeScoreSheetStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calculateScoreFromSnapshot } from "@/lib/judging/calculate-score-from-snapshot";
import { backfillJudgingClassOnOrphanSheets } from "@/lib/judging/score-sheet-judging-class-link";
import { resolveRegistrationContact } from "@/lib/registration-contact";

const SCORING_STATUSES: JudgeScoreSheetStatus[] = ["SUBMITTED", "FINALIZED"];

export type ScoreSheetSectionAverage = {
  sectionName: string;
  sortOrder: number;
  averageScore: number;
};

export type ScoreSheetResultRow = {
  rank: number | null;
  vehicleEntryCode: string;
  vehicleNickname: string | null;
  year: number;
  make: string;
  model: string;
  vehicleClass: string;
  ownerName: string | null;
  officialScore: number | null;
  judgeCount: number;
  highScore: number | null;
  lowScore: number | null;
  scoreSpread: number | null;
  draftCount: number;
  submittedCount: number;
  finalizedCount: number;
  isTied: boolean;
  sectionAverages: ScoreSheetSectionAverage[];
};

export type ScoreSheetClassSummary = {
  eligibleVehicleCount: number;
  rankedVehicleCount: number;
  draftSheetCount: number;
  submittedSheetCount: number;
  finalizedSheetCount: number;
};

export type ScoreSheetClassResults = {
  judgingClass: {
    id: string;
    name: string;
    templateName: string;
    totalPoints: number;
    methodology: string;
  };
  summary: ScoreSheetClassSummary;
  ranked: ScoreSheetResultRow[];
  unrankedDraftOnly: ScoreSheetResultRow[];
};

function categoryLabel(row: {
  customName: string | null;
  category: { name: string } | null;
} | null): string {
  if (!row) return "—";
  return row.customName?.trim() || row.category?.name || "—";
}

const registrationVehicleResultSelect = {
  registrationId: true,
  publicVehicleId: true,
  vehicleNickname: true,
  vehicle: {
    select: { nickname: true, year: true, make: true, model: true },
  },
  eventCategory: {
    select: {
      customName: true,
      category: { select: { name: true } },
    },
  },
} as const;

type RegistrationVehicleResultRow = {
  registrationId: string;
  publicVehicleId: string | null;
  vehicleNickname: string | null;
  vehicle: {
    nickname: string | null;
    year: number;
    make: string;
    model: string;
  };
  eventCategory: {
    customName: string | null;
    category: { name: string } | null;
  } | null;
};

async function loadRegistrationVehiclesByEntryCodes(
  eventId: string,
  entryCodes: string[],
): Promise<RegistrationVehicleResultRow[]> {
  if (entryCodes.length === 0) return [];
  return prisma.registrationVehicle.findMany({
    where: {
      registration: { eventId },
      publicVehicleId: { in: entryCodes },
    },
    select: registrationVehicleResultSelect,
    orderBy: [{ publicVehicleId: "asc" }],
  });
}

/** Vehicles in class categories plus any with score sheets (e.g. category assignment judging). */
async function loadVehiclesForClassResults(
  eventId: string,
  categoryIds: string[],
  sheetEntryCodes: string[],
): Promise<RegistrationVehicleResultRow[]> {
  const categoryEligible =
    categoryIds.length === 0
      ? []
      : await prisma.registrationVehicle.findMany({
          where: {
            registration: { eventId },
            publicVehicleId: { not: null },
            eventCategoryId: { in: categoryIds },
          },
          select: registrationVehicleResultSelect,
          orderBy: [{ publicVehicleId: "asc" }],
        });

  const eligibleCodes = new Set(
    categoryEligible
      .map((v) => v.publicVehicleId)
      .filter((code): code is string => !!code),
  );

  if (categoryEligible.length === 0 && sheetEntryCodes.length > 0) {
    return loadRegistrationVehiclesByEntryCodes(eventId, sheetEntryCodes);
  }

  const extraCodes = sheetEntryCodes.filter((code) => !eligibleCodes.has(code));
  const sheetVehicles = await loadRegistrationVehiclesByEntryCodes(
    eventId,
    extraCodes,
  );

  return [...categoryEligible, ...sheetVehicles];
}

/** Average official score from per-judge final scores (submitted/finalized only). */
export function computeOfficialScoreAggregate(finalScores: number[]) {
  if (finalScores.length === 0) {
    return {
      officialScore: null as number | null,
      judgeCount: 0,
      highScore: null as number | null,
      lowScore: null as number | null,
      scoreSpread: null as number | null,
    };
  }
  const officialScore =
    finalScores.reduce((sum, s) => sum + s, 0) / finalScores.length;
  const highScore = Math.max(...finalScores);
  const lowScore = Math.min(...finalScores);
  return {
    officialScore: roundScore(officialScore),
    judgeCount: finalScores.length,
    highScore: roundScore(highScore),
    lowScore: roundScore(lowScore),
    scoreSpread: roundScore(highScore - lowScore),
  };
}

export function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Dense rank by officialScore descending; same score shares rank. */
export function applyDenseRanking<T extends { officialScore: number }>(
  rows: T[],
): Array<T & { rank: number; isTied: boolean }> {
  const sorted = [...rows].sort((a, b) => b.officialScore - a.officialScore);
  const out: Array<T & { rank: number; isTied: boolean }> = [];
  let rank = 0;
  let prevScore: number | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i]!;
    if (prevScore !== row.officialScore) {
      rank = i + 1;
      prevScore = row.officialScore;
    }
    const nextScore = sorted[i + 1]?.officialScore;
    const prevRowScore = sorted[i - 1]?.officialScore;
    const isTied =
      nextScore === row.officialScore ||
      (i > 0 && prevRowScore === row.officialScore);
    out.push({ ...row, rank, isTied });
  }

  return out;
}

function countByStatus(
  sheets: Array<{ status: JudgeScoreSheetStatus }>,
): { draft: number; submitted: number; finalized: number } {
  let draft = 0;
  let submitted = 0;
  let finalized = 0;
  for (const s of sheets) {
    if (s.status === "DRAFT") draft++;
    else if (s.status === "SUBMITTED") submitted++;
    else if (s.status === "FINALIZED") finalized++;
  }
  return { draft, submitted, finalized };
}

function averageSectionScores(
  sheets: Array<{
    sections: Array<{ name: string; sortOrder: number }>;
    sectionScores: number[];
  }>,
): ScoreSheetSectionAverage[] {
  if (sheets.length === 0) return [];

  const byKey = new Map<string, { name: string; sortOrder: number; scores: number[] }>();

  for (const sheet of sheets) {
    sheet.sections.forEach((section, index) => {
      const score = sheet.sectionScores[index];
      if (score == null || Number.isNaN(score)) return;
      const key = `${section.sortOrder}:${section.name}`;
      let bucket = byKey.get(key);
      if (!bucket) {
        bucket = { name: section.name, sortOrder: section.sortOrder, scores: [] };
        byKey.set(key, bucket);
      }
      bucket.scores.push(score);
    });
  }

  return [...byKey.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((bucket) => ({
      sectionName: bucket.name,
      sortOrder: bucket.sortOrder,
      averageScore: roundScore(
        bucket.scores.reduce((a, b) => a + b, 0) / bucket.scores.length,
      ),
    }));
}

export function buildScoreSheetResultsCsv(input: {
  eventName: string;
  judgingClassName: string;
  ranked: ScoreSheetResultRow[];
  unrankedDraftOnly: ScoreSheetResultRow[];
}): string {
  const header = [
    "event_name",
    "judging_class_name",
    "rank",
    "is_tied",
    "vehicle_entry_code",
    "vehicle_nickname",
    "vehicle_year",
    "vehicle_make",
    "vehicle_model",
    "vehicle_class",
    "owner_name",
    "average_score",
    "judge_count",
    "high_score",
    "low_score",
    "score_spread",
    "submitted_count",
    "finalized_count",
    "draft_count",
  ].join(",");

  const rows = [...input.ranked, ...input.unrankedDraftOnly];
  const lines = [
    header,
    ...rows.map((row) =>
      [
        csvEscape(input.eventName),
        csvEscape(input.judgingClassName),
        row.rank != null ? String(row.rank) : "",
        row.isTied ? "yes" : "no",
        csvEscape(row.vehicleEntryCode),
        csvEscape(row.vehicleNickname ?? ""),
        String(row.year),
        csvEscape(row.make),
        csvEscape(row.model),
        csvEscape(row.vehicleClass),
        csvEscape(row.ownerName ?? ""),
        row.officialScore != null ? String(row.officialScore) : "",
        String(row.judgeCount),
        row.highScore != null ? String(row.highScore) : "",
        row.lowScore != null ? String(row.lowScore) : "",
        row.scoreSpread != null ? String(row.scoreSpread) : "",
        String(row.submittedCount),
        String(row.finalizedCount),
        String(row.draftCount),
      ].join(","),
    ),
  ];

  return lines.join("\n");
}

export function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function aggregateScoreSheetResults(
  eventId: string,
  judgingClassId: string,
  options?: { includeOwnerNames?: boolean },
): Promise<ScoreSheetClassResults | null> {
  const judgingClass = await prisma.eventJudgingClass.findFirst({
    where: { id: judgingClassId, eventId },
    select: {
      id: true,
      name: true,
      template: {
        select: { id: true, name: true, totalPoints: true, methodology: true },
      },
      eligibleCategories: { select: { eventCategoryId: true } },
    },
  });
  if (!judgingClass) return null;

  await backfillJudgingClassOnOrphanSheets({
    eventId,
    judgingClassId,
    eventJudgingTemplateId: judgingClass.template.id,
  });

  const categoryIds = judgingClass.eligibleCategories.map((c) => c.eventCategoryId);

  const sheets = await prisma.judgeScoreSheet.findMany({
    where: { eventId, eventJudgingClassId: judgingClassId },
    select: {
      id: true,
      vehicleEntryCode: true,
      registrationId: true,
      judgeUserId: true,
      status: true,
      finalScore: true,
    },
  });

  const sheetEntryCodes = [...new Set(sheets.map((s) => s.vehicleEntryCode))];
  const resultVehicles = await loadVehiclesForClassResults(
    eventId,
    categoryIds,
    sheetEntryCodes,
  );

  const scoringSheetIds = sheets
    .filter((s) => SCORING_STATUSES.includes(s.status) && s.finalScore != null)
    .map((s) => s.id);

  const sheetsWithSections =
    scoringSheetIds.length > 0
      ? await prisma.judgeScoreSheet.findMany({
          where: { id: { in: scoringSheetIds } },
          select: {
            vehicleEntryCode: true,
            methodology: true,
            totalPoints: true,
            sections: {
              orderBy: { sortOrder: "asc" },
              select: {
                name: true,
                sortOrder: true,
                weightPercent: true,
                maxSectionPoints: true,
                items: {
                  orderBy: { sortOrder: "asc" },
                  select: {
                    maxPoints: true,
                    awardedPoints: true,
                    deductions: {
                      select: {
                        pointsDeducted: true,
                        deductionBucket: true,
                      },
                    },
                  },
                },
              },
            },
          },
        })
      : [];

  const sectionCalcsByVehicle = new Map<
    string,
    Array<{ sections: Array<{ name: string; sortOrder: number }>; sectionScores: number[] }>
  >();
  for (const sheet of sheetsWithSections) {
    const calculated = calculateScoreFromSnapshot(sheet);
    const list = sectionCalcsByVehicle.get(sheet.vehicleEntryCode) ?? [];
    list.push({
      sections: sheet.sections.map((s) => ({ name: s.name, sortOrder: s.sortOrder })),
      sectionScores: calculated.sectionScores,
    });
    sectionCalcsByVehicle.set(sheet.vehicleEntryCode, list);
  }

  const sheetsByVehicle = new Map<string, typeof sheets>();
  for (const sheet of sheets) {
    const list = sheetsByVehicle.get(sheet.vehicleEntryCode) ?? [];
    list.push(sheet);
    sheetsByVehicle.set(sheet.vehicleEntryCode, list);
  }

  const registrationIds = [
    ...new Set(resultVehicles.map((v) => v.registrationId)),
  ];
  const registrations =
    options?.includeOwnerNames && registrationIds.length > 0
      ? await prisma.registration.findMany({
          where: { id: { in: registrationIds } },
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
        })
      : [];
  const ownerByRegistrationId = new Map(
    registrations.map((r) => [r.id, resolveRegistrationContact(r).name]),
  );

  type VehicleBuild = {
    vehicleEntryCode: string;
    vehicleNickname: string | null;
    year: number;
    make: string;
    model: string;
    vehicleClass: string;
    ownerName: string | null;
    draftCount: number;
    submittedCount: number;
    finalizedCount: number;
    scoringFinalScores: number[];
    interimFinalScores: number[];
    sectionAverages: ScoreSheetSectionAverage[];
  };

  const vehicleRows: VehicleBuild[] = resultVehicles.map((v) => {
    const code = v.publicVehicleId ?? "";
    const vehicleSheets = sheetsByVehicle.get(code) ?? [];
    const statusCounts = countByStatus(vehicleSheets);
    const scoringFinalScores = vehicleSheets
      .filter(
        (s) =>
          SCORING_STATUSES.includes(s.status) &&
          s.finalScore != null &&
          !Number.isNaN(s.finalScore),
      )
      .map((s) => s.finalScore as number);

    const interimFinalScores = vehicleSheets
      .filter(
        (s) =>
          s.status === "DRAFT" &&
          s.finalScore != null &&
          !Number.isNaN(s.finalScore),
      )
      .map((s) => s.finalScore as number);

    return {
      vehicleEntryCode: code,
      vehicleNickname: v.vehicleNickname?.trim() || v.vehicle.nickname?.trim() || null,
      year: v.vehicle.year,
      make: v.vehicle.make,
      model: v.vehicle.model,
      vehicleClass: categoryLabel(v.eventCategory),
      ownerName: options?.includeOwnerNames
        ? (ownerByRegistrationId.get(v.registrationId) ?? null)
        : null,
      draftCount: statusCounts.draft,
      submittedCount: statusCounts.submitted,
      finalizedCount: statusCounts.finalized,
      scoringFinalScores,
      interimFinalScores,
      sectionAverages: averageSectionScores(sectionCalcsByVehicle.get(code) ?? []),
    };
  });

  const rankedCandidates = vehicleRows
    .filter((v) => v.scoringFinalScores.length > 0)
    .map((v) => {
      const agg = computeOfficialScoreAggregate(v.scoringFinalScores);
      return {
        vehicleEntryCode: v.vehicleEntryCode,
        vehicleNickname: v.vehicleNickname,
        year: v.year,
        make: v.make,
        model: v.model,
        vehicleClass: v.vehicleClass,
        ownerName: v.ownerName,
        officialScore: agg.officialScore as number,
        judgeCount: agg.judgeCount,
        highScore: agg.highScore,
        lowScore: agg.lowScore,
        scoreSpread: agg.scoreSpread,
        draftCount: v.draftCount,
        submittedCount: v.submittedCount,
        finalizedCount: v.finalizedCount,
        sectionAverages: v.sectionAverages,
      };
    });

  const ranked = applyDenseRanking(rankedCandidates).map((row) => ({
    rank: row.rank,
    vehicleEntryCode: row.vehicleEntryCode,
    vehicleNickname: row.vehicleNickname,
    year: row.year,
    make: row.make,
    model: row.model,
    vehicleClass: row.vehicleClass,
    ownerName: row.ownerName,
    officialScore: row.officialScore,
    judgeCount: row.judgeCount,
    highScore: row.highScore,
    lowScore: row.lowScore,
    scoreSpread: row.scoreSpread,
    draftCount: row.draftCount,
    submittedCount: row.submittedCount,
    finalizedCount: row.finalizedCount,
    isTied: row.isTied,
    sectionAverages: row.sectionAverages,
  }));

  const unrankedDraftOnly: ScoreSheetResultRow[] = vehicleRows
    .filter((v) => v.scoringFinalScores.length === 0)
    .map((v) => {
      const interim =
        v.interimFinalScores.length > 0
          ? computeOfficialScoreAggregate(v.interimFinalScores)
          : null;
      return {
      rank: null,
      vehicleEntryCode: v.vehicleEntryCode,
      vehicleNickname: v.vehicleNickname,
      year: v.year,
      make: v.make,
      model: v.model,
      vehicleClass: v.vehicleClass,
      ownerName: v.ownerName,
      officialScore: interim?.officialScore ?? null,
      judgeCount: 0,
      highScore: null,
      lowScore: null,
      scoreSpread: null,
      draftCount: v.draftCount,
      submittedCount: v.submittedCount,
      finalizedCount: v.finalizedCount,
      isTied: false,
      sectionAverages: v.sectionAverages,
    };
    });

  const summary: ScoreSheetClassSummary = {
    eligibleVehicleCount: resultVehicles.length,
    rankedVehicleCount: ranked.length,
    draftSheetCount: sheets.filter((s) => s.status === "DRAFT").length,
    submittedSheetCount: sheets.filter((s) => s.status === "SUBMITTED").length,
    finalizedSheetCount: sheets.filter((s) => s.status === "FINALIZED").length,
  };

  return {
    judgingClass: {
      id: judgingClass.id,
      name: judgingClass.name,
      templateName: judgingClass.template.name,
      totalPoints: judgingClass.template.totalPoints,
      methodology: judgingClass.template.methodology,
    },
    summary,
    ranked,
    unrankedDraftOnly,
  };
}

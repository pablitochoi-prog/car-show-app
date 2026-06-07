import type {
  JudgingDeductionBucket,
  JudgingMethodology,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { resolveRegistrationContact } from "@/lib/registration-contact";
import { calculateScoreFromSnapshot } from "@/lib/judging/calculate-score-from-snapshot";
import {
  formatOrganizerItemDeduction,
  formatScorePoints,
  resolveSectionMaxPoints,
} from "@/lib/judging/organizer-score-sheet-display";
import { csvEscape } from "@/lib/judging/score-sheet-results";
import {
  SCORING_STATUSES,
  formatJudgeIdentityForOrganizer,
} from "@/lib/judging/organizer-score-sheet-vehicle-detail";

export type JudgeMatrixJudgeOption = {
  userId: string;
  name: string;
  email: string;
  sheetCount: number;
};

export type JudgeMatrixVehicleColumn = {
  vehicleEntryCode: string;
  year: number;
  make: string;
  model: string;
  ownerName: string | null;
  finalScore: number;
  totalPoints: number;
};

export type JudgeMatrixSectionRow = {
  kind: "section";
  sectionName: string;
  sectionSortOrder: number;
};

export type JudgeMatrixItemRow = {
  kind: "item";
  rowKey: string;
  sectionSortOrder: number;
  itemSortOrder: number;
  label: string;
  isIndented: boolean;
  maxPoints: number;
  deductionsByVehicle: Record<string, string>;
};

export type JudgeMatrixSubtotalRow = {
  kind: "subtotal";
  sectionSortOrder: number;
  sectionMax: number;
  scoresByVehicle: Record<string, string>;
};

export type JudgeMatrixTotalRow = {
  kind: "total";
  scoresByVehicle: Record<string, string>;
};

export type JudgeMatrixRow =
  | JudgeMatrixSectionRow
  | JudgeMatrixItemRow
  | JudgeMatrixSubtotalRow
  | JudgeMatrixTotalRow;

export type OrganizerJudgeScoreSheetMatrix = {
  judge: { userId: string; name: string; email: string };
  judgingClass: {
    id: string;
    name: string;
    methodology: string;
    totalPoints: number;
  };
  vehicles: JudgeMatrixVehicleColumn[];
  rows: JudgeMatrixRow[];
};

type MatrixSheet = {
  vehicleEntryCode: string;
  methodology: JudgingMethodology;
  totalPoints: number;
  finalScore: number | null;
  sections: Array<{
    name: string;
    sortOrder: number;
    maxSectionPoints: number | null;
    items: Array<{
      sortOrder: number;
      maxPoints: number;
      awardedPoints: number | null;
      pointType: import("@prisma/client").JudgingSubcategoryPointType | null;
      scoringType: import("@prisma/client").JudgingSubcategoryScoringType;
      allowMultipleViolations: boolean;
      deductionOptions: Array<{
        id: string;
        pointsDeducted: number;
        deductionBucket: JudgingDeductionBucket | null;
      }>;
      deductions: Array<{
        optionId: string | null;
        pointsDeducted: number;
        violationCount: number;
        discretionaryPoints: number | null;
        deductionBucket: JudgingDeductionBucket | null;
      }>;
    }>;
  }>;
};

const sheetMatrixInclude = {
  judge: { select: { id: true, name: true, email: true, status: true } },
  sections: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      items: {
        orderBy: { sortOrder: "asc" as const },
        include: {
          deductions: true,
          deductionOptions: { orderBy: { sortOrder: "asc" as const } },
        },
      },
    },
  },
  registrationVehicle: {
    select: {
      vehicleNickname: true,
      vehicle: { select: { year: true, make: true, model: true } },
      registration: {
        select: {
          registrantFirstName: true,
          registrantLastName: true,
          registrantEmail: true,
          registrantPhone: true,
          guestFirstName: true,
          guestLastName: true,
          guestEmail: true,
          guestPhone: true,
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
      },
    },
  },
} as const;

function itemRowKey(sectionSortOrder: number, itemSortOrder: number): string {
  return `${sectionSortOrder}:${itemSortOrder}`;
}

function formatScoreCell(score: number, max: number): string {
  return `${formatScorePoints(score)} / ${formatScorePoints(max)}`;
}

function buildSheetScoreSummary(sheet: MatrixSheet) {
  const calculated = calculateScoreFromSnapshot({
    methodology: sheet.methodology,
    totalPoints: sheet.totalPoints,
    sections: sheet.sections.map((section) => ({
      weightPercent: null,
      maxSectionPoints: section.maxSectionPoints,
      items: section.items.map((item) => ({
        maxPoints: item.maxPoints,
        awardedPoints: item.awardedPoints,
        pointType: item.pointType,
        scoringType: item.scoringType ?? "LEVELS",
        allowMultipleViolations: item.allowMultipleViolations,
        deductionOptions: item.deductionOptions,
        deductions: item.deductions.map((d) => ({
          optionId: d.optionId,
          pointsDeducted: d.pointsDeducted,
          violationCount: d.violationCount,
          discretionaryPoints: d.discretionaryPoints,
          deductionBucket: d.deductionBucket,
        })),
      })),
    })),
  });

  return {
    finalScore: sheet.finalScore ?? calculated.finalScore,
    sectionScores: calculated.sectionScores,
    sectionMaxes: sheet.sections.map((section) =>
      resolveSectionMaxPoints(section.maxSectionPoints, section.items),
    ),
  };
}

function buildItemDeductionMap(sheet: MatrixSheet): Map<string, string> {
  const map = new Map<string, string>();
  for (const section of sheet.sections) {
    for (const item of section.items) {
      const key = itemRowKey(section.sortOrder, item.sortOrder);
      const value = formatOrganizerItemDeduction(
        {
          id: key,
          label: "",
          maxPoints: item.maxPoints,
          isIndented: false,
          awardedPoints: item.awardedPoints,
          itemNotes: null,
          deductions: item.deductions.map((d) => ({
            label: "",
            pointsDeducted: d.pointsDeducted,
            deductionBucket: null,
            comment: null,
          })),
        },
        sheet.methodology,
      );
      map.set(key, value);
    }
  }
  return map;
}

export async function listJudgesWithSubmittedScoreSheets(
  eventId: string,
  judgingClassId: string,
): Promise<JudgeMatrixJudgeOption[]> {
  const sheets = await prisma.judgeScoreSheet.findMany({
    where: {
      eventId,
      eventJudgingClassId: judgingClassId,
      status: { in: SCORING_STATUSES },
    },
    select: {
      judgeUserId: true,
      judge: { select: { id: true, name: true, email: true, status: true } },
    },
  });

  const byJudge = new Map<string, JudgeMatrixJudgeOption>();
  for (const sheet of sheets) {
    const existing = byJudge.get(sheet.judgeUserId);
    if (existing) {
      existing.sheetCount += 1;
      continue;
    }
    const identity = formatJudgeIdentityForOrganizer(sheet.judge);
    byJudge.set(sheet.judgeUserId, {
      userId: identity.userId,
      name: identity.name,
      email: identity.email,
      sheetCount: 1,
    });
  }

  return [...byJudge.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadOrganizerJudgeScoreSheetMatrix(
  eventId: string,
  judgeUserId: string,
  judgingClassId: string,
): Promise<OrganizerJudgeScoreSheetMatrix | null> {
  const judgingClass = await prisma.eventJudgingClass.findFirst({
    where: { id: judgingClassId, eventId },
    select: {
      id: true,
      name: true,
      template: { select: { methodology: true, totalPoints: true } },
    },
  });
  if (!judgingClass) return null;

  const sheets = await prisma.judgeScoreSheet.findMany({
    where: {
      eventId,
      judgeUserId,
      eventJudgingClassId: judgingClassId,
      status: { in: SCORING_STATUSES },
    },
    include: sheetMatrixInclude,
    orderBy: { vehicleEntryCode: "asc" },
  });
  if (sheets.length === 0) return null;

  const judge = formatJudgeIdentityForOrganizer(sheets[0]!.judge);
  const templateSheet = sheets[0]!;

  const vehicles: JudgeMatrixVehicleColumn[] = [];
  const deductionMaps = new Map<string, Map<string, string>>();
  const scoreSummaries = new Map<
    string,
    ReturnType<typeof buildSheetScoreSummary>
  >();

  for (const sheet of sheets) {
    const matrixSheet = sheet as typeof sheet & MatrixSheet;
    const rv = sheet.registrationVehicle;
    const year = rv?.vehicle.year ?? 0;
    const make = rv?.vehicle.make ?? "";
    const model = rv?.vehicle.model ?? "";
    let ownerName: string | null = null;
    if (sheet.registrationVehicle?.registration) {
      ownerName =
        resolveRegistrationContact(sheet.registrationVehicle.registration).name ||
        null;
    }

    let summary: ReturnType<typeof buildSheetScoreSummary>;
    try {
      summary = buildSheetScoreSummary(matrixSheet);
    } catch (error) {
      console.error(
        `judge-matrix score summary failed for ${sheet.vehicleEntryCode}`,
        error,
      );
      continue;
    }
    scoreSummaries.set(sheet.vehicleEntryCode, summary);

    vehicles.push({
      vehicleEntryCode: sheet.vehicleEntryCode,
      year,
      make,
      model,
      ownerName,
      finalScore: summary.finalScore,
      totalPoints: sheet.totalPoints,
    });
    deductionMaps.set(sheet.vehicleEntryCode, buildItemDeductionMap(matrixSheet));
  }

  if (vehicles.length === 0) return null;

  const totalScoresByVehicle: Record<string, string> = {};
  for (const vehicle of vehicles) {
    const summary = scoreSummaries.get(vehicle.vehicleEntryCode);
    totalScoresByVehicle[vehicle.vehicleEntryCode] = summary
      ? formatScoreCell(summary.finalScore, vehicle.totalPoints)
      : "";
  }

  const rows: JudgeMatrixRow[] = [
    {
      kind: "total",
      scoresByVehicle: totalScoresByVehicle,
    },
  ];

  for (const [sectionIndex, section] of templateSheet.sections.entries()) {
    rows.push({
      kind: "section",
      sectionName: section.name,
      sectionSortOrder: section.sortOrder,
    });
    for (const item of section.items) {
      const rowKey = itemRowKey(section.sortOrder, item.sortOrder);
      const deductionsByVehicle: Record<string, string> = {};
      for (const vehicle of vehicles) {
        const cell = deductionMaps.get(vehicle.vehicleEntryCode)?.get(rowKey) ?? "";
        deductionsByVehicle[vehicle.vehicleEntryCode] = cell;
      }
      rows.push({
        kind: "item",
        rowKey,
        sectionSortOrder: section.sortOrder,
        itemSortOrder: item.sortOrder,
        label: item.label,
        isIndented: item.isIndented,
        maxPoints: item.maxPoints,
        deductionsByVehicle,
      });
    }

    const sectionMax = resolveSectionMaxPoints(
      section.maxSectionPoints,
      section.items,
    );
    const scoresByVehicle: Record<string, string> = {};
    for (const vehicle of vehicles) {
      const summary = scoreSummaries.get(vehicle.vehicleEntryCode);
      const sectionScore = summary?.sectionScores[sectionIndex] ?? 0;
      scoresByVehicle[vehicle.vehicleEntryCode] = formatScoreCell(
        sectionScore,
        sectionMax,
      );
    }
    rows.push({
      kind: "subtotal",
      sectionSortOrder: section.sortOrder,
      sectionMax,
      scoresByVehicle,
    });
  }

  return {
    judge,
    judgingClass: {
      id: judgingClass.id,
      name: judgingClass.name,
      methodology: judgingClass.template.methodology,
      totalPoints: judgingClass.template.totalPoints,
    },
    vehicles,
    rows,
  };
}

function emptyVehicleCells(count: number): string[] {
  return Array.from({ length: count }, () => "");
}

/** CSV export for one judge's scorecard matrix (matches on-screen layout). */
export function buildJudgeScoreSheetMatrixCsv(input: {
  eventName: string;
  matrix: OrganizerJudgeScoreSheetMatrix;
}): string {
  const { matrix } = input;
  const vehicles = matrix.vehicles;
  const vehicleIds = vehicles.map((v) => csvEscape(v.vehicleEntryCode));
  const vehicleLabels = vehicles.map((v) =>
    csvEscape(`${v.year} ${v.make} ${v.model}`.trim()),
  );
  const ownerLabels = vehicles.map((v) => csvEscape(v.ownerName ?? ""));

  const lines: string[] = [
    ["event_name", csvEscape(input.eventName)].join(","),
    ["judging_class", csvEscape(matrix.judgingClass.name)].join(","),
    ["judge_name", csvEscape(matrix.judge.name)].join(","),
    ["judge_email", csvEscape(matrix.judge.email)].join(","),
    "",
    ["row_type", "subcategory", "max_points", ...vehicleIds].join(","),
    ["vehicle", "", "", ...vehicleLabels].join(","),
    ["owner", "", "", ...ownerLabels].join(","),
  ];

  for (const row of matrix.rows) {
    if (row.kind === "total") {
      lines.push(
        [
          "total_score",
          "TOTAL SCORE FOR VEHICLE",
          "",
          ...vehicles.map((v) => row.scoresByVehicle[v.vehicleEntryCode] ?? ""),
        ].join(","),
      );
      continue;
    }

    if (row.kind === "section") {
      lines.push(
        [
          "section",
          csvEscape(row.sectionName.toUpperCase()),
          "",
          ...emptyVehicleCells(vehicles.length),
        ].join(","),
      );
      continue;
    }

    if (row.kind === "subtotal") {
      lines.push(
        [
          "subtotal",
          "SECTION SUBTOTAL",
          String(row.sectionMax),
          ...vehicles.map((v) => row.scoresByVehicle[v.vehicleEntryCode] ?? ""),
        ].join(","),
      );
      continue;
    }

    const label = `${row.isIndented ? "  " : ""}${row.label}`;
    const deductions = vehicles.map(
      (v) => row.deductionsByVehicle[v.vehicleEntryCode] ?? "",
    );
    lines.push(
      ["item", csvEscape(label), String(row.maxPoints), ...deductions].join(","),
    );
  }

  return lines.join("\n");
}

export function judgeScoreSheetMatrixCsvFilename(input: {
  eventId: string;
  judgeName: string;
  className: string;
}): string {
  const slug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30);

  const judgeSlug = slug(input.judgeName) || "judge";
  const classSlug = slug(input.className) || "class";
  return `judge-scorecard-${input.eventId.slice(0, 8)}-${judgeSlug}-${classSlug}.csv`;
}

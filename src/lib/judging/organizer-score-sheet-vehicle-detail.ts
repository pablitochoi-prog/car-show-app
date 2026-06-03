import type {
  JudgeScoreSheetStatus,
  JudgingDeductionBucket,
  JudgingMethodology,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { calculateScoreFromSnapshot } from "@/lib/judging/calculate-score-from-snapshot";
import {
  aggregateScoreSheetResults,
  type ScoreSheetResultRow,
} from "@/lib/judging/score-sheet-results";
import { formatSubmittedAt } from "@/lib/format-submitted-at";
import { maskContactIfBanned } from "@/lib/mask-banned-user-contact";

export const SCORING_STATUSES: JudgeScoreSheetStatus[] = ["SUBMITTED", "FINALIZED"];

const sheetDetailInclude = {
  sections: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      items: {
        orderBy: { sortOrder: "asc" as const },
        include: {
          deductionOptions: { orderBy: { sortOrder: "asc" as const } },
          deductions: true,
        },
      },
    },
  },
  judge: {
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
    },
  },
  eventJudgingClass: { select: { id: true, name: true } },
} as const;

export type OrganizerScoreSheetItemView = {
  id: string;
  label: string;
  maxPoints: number;
  awardedPoints: number | null;
  itemNotes: string | null;
  deductions: Array<{
    label: string;
    pointsDeducted: number;
    deductionBucket: string | null;
    comment: string | null;
  }>;
};

export type OrganizerScoreSheetSectionView = {
  id: string;
  name: string;
  sortOrder: number;
  sectionScore: number;
  items: OrganizerScoreSheetItemView[];
};

export type OrganizerJudgeScoreSheetView = {
  sheetId: string;
  judge: { userId: string; name: string; email: string };
  status: JudgeScoreSheetStatus;
  submittedAt: string | null;
  submittedAtLabel: string | null;
  finalScore: number | null;
  originalityDeductions: number;
  conditionDeductions: number;
  generalNotes: string | null;
  methodology: string;
  totalPoints: number;
  calculatedFinalScore: number;
  sections: OrganizerScoreSheetSectionView[];
};

export type OrganizerVehicleScoreSheetDetail = {
  vehicle: ScoreSheetResultRow | null;
  judgingClass: {
    id: string;
    name: string;
    templateName: string;
    totalPoints: number;
    methodology: string;
  };
  officialSummary: {
    officialScore: number | null;
    judgeCount: number;
    highScore: number | null;
    lowScore: number | null;
    scoreSpread: number | null;
  };
  scoringSheets: OrganizerJudgeScoreSheetView[];
  draftSheets: OrganizerJudgeScoreSheetView[];
};

export function formatJudgeIdentityForOrganizer(user: {
  id: string;
  name: string;
  email: string;
  status: string | null;
}) {
  const banned = user.status === "BANNED";
  return {
    userId: user.id,
    name: user.name,
    email: banned ? maskContactIfBanned("BANNED", user.email) : user.email,
  };
}

export function isScoringStatus(status: JudgeScoreSheetStatus): boolean {
  return SCORING_STATUSES.includes(status);
}

export function serializeOrganizerJudgeScoreSheet(
  sheet: {
    id: string;
    status: JudgeScoreSheetStatus;
    methodology: JudgingMethodology;
    totalPoints: number;
    finalScore: number | null;
    originalityDeductions: number;
    conditionDeductions: number;
    generalNotes: string | null;
    submittedAt: Date | null;
    judge: {
      id: string;
      name: string;
      email: string;
      status: string | null;
    };
    sections: Array<{
      id: string;
      name: string;
      sortOrder: number;
      weightPercent: number | null;
      maxSectionPoints: number | null;
      items: Array<{
        id: string;
        label: string;
        maxPoints: number;
        awardedPoints: number | null;
        itemNotes: string | null;
        deductions: Array<{
          label: string;
          pointsDeducted: number;
          deductionBucket: string | null;
          comment: string | null;
        }>;
      }>;
    }>;
  },
): OrganizerJudgeScoreSheetView {
  const calculated = calculateScoreFromSnapshot({
    methodology: sheet.methodology,
    totalPoints: sheet.totalPoints,
    sections: sheet.sections.map((section) => ({
      weightPercent: section.weightPercent,
      maxSectionPoints: section.maxSectionPoints,
      items: section.items.map((item) => ({
        maxPoints: item.maxPoints,
        awardedPoints: item.awardedPoints,
        deductions: item.deductions.map((d) => ({
          pointsDeducted: d.pointsDeducted,
          deductionBucket: d.deductionBucket as JudgingDeductionBucket | null,
        })),
      })),
    })),
  });
  const submittedIso = sheet.submittedAt?.toISOString() ?? null;

  return {
    sheetId: sheet.id,
    judge: formatJudgeIdentityForOrganizer(sheet.judge),
    status: sheet.status,
    submittedAt: submittedIso,
    submittedAtLabel: submittedIso ? formatSubmittedAt(submittedIso) : null,
    finalScore: sheet.finalScore,
    originalityDeductions: sheet.originalityDeductions,
    conditionDeductions: sheet.conditionDeductions,
    generalNotes: sheet.generalNotes,
    methodology: sheet.methodology,
    totalPoints: sheet.totalPoints,
    calculatedFinalScore: calculated.finalScore,
    sections: sheet.sections.map((section, sectionIndex) => ({
      id: section.id,
      name: section.name,
      sortOrder: section.sortOrder,
      sectionScore: calculated.sectionScores[sectionIndex] ?? 0,
      items: section.items.map((item) => ({
        id: item.id,
        label: item.label,
        maxPoints: item.maxPoints,
        awardedPoints: item.awardedPoints,
        itemNotes: item.itemNotes,
        deductions: item.deductions.map((d) => ({
          label: d.label,
          pointsDeducted: d.pointsDeducted,
          deductionBucket: d.deductionBucket,
          comment: d.comment,
        })),
      })),
    })),
  };
}

function findVehicleRow(
  classResults: Awaited<ReturnType<typeof aggregateScoreSheetResults>>,
  vehicleEntryCode: string,
): ScoreSheetResultRow | null {
  if (!classResults) return null;
  return (
    classResults.ranked.find((r) => r.vehicleEntryCode === vehicleEntryCode) ??
    classResults.unrankedDraftOnly.find((r) => r.vehicleEntryCode === vehicleEntryCode) ??
    null
  );
}

export async function loadOrganizerVehicleScoreSheetDetail(
  eventId: string,
  judgingClassId: string,
  vehicleEntryCode: string,
  options?: { includeDrafts?: boolean },
): Promise<OrganizerVehicleScoreSheetDetail | null> {
  const judgingClass = await prisma.eventJudgingClass.findFirst({
    where: { id: judgingClassId, eventId },
    select: {
      id: true,
      name: true,
      template: {
        select: { name: true, totalPoints: true, methodology: true },
      },
    },
  });
  if (!judgingClass) return null;

  const classResults = await aggregateScoreSheetResults(eventId, judgingClassId, {
    includeOwnerNames: true,
  });
  const vehicleRow = findVehicleRow(classResults, vehicleEntryCode);

  const sheets = await prisma.judgeScoreSheet.findMany({
    where: {
      eventId,
      eventJudgingClassId: judgingClassId,
      vehicleEntryCode,
    },
    include: sheetDetailInclude,
    orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
  });

  const scoringRaw = sheets.filter((s) => isScoringStatus(s.status));
  const draftRaw = options?.includeDrafts
    ? sheets.filter((s) => s.status === "DRAFT")
    : [];

  const scoringSheets = scoringRaw.map(serializeOrganizerJudgeScoreSheet);
  const draftSheets = draftRaw.map(serializeOrganizerJudgeScoreSheet);

  return {
    vehicle: vehicleRow,
    judgingClass: {
      id: judgingClass.id,
      name: judgingClass.name,
      templateName: judgingClass.template.name,
      totalPoints: judgingClass.template.totalPoints,
      methodology: judgingClass.template.methodology,
    },
    officialSummary: {
      officialScore: vehicleRow?.officialScore ?? null,
      judgeCount: vehicleRow?.judgeCount ?? scoringSheets.length,
      highScore: vehicleRow?.highScore ?? null,
      lowScore: vehicleRow?.lowScore ?? null,
      scoreSpread: vehicleRow?.scoreSpread ?? null,
    },
    scoringSheets,
    draftSheets,
  };
}

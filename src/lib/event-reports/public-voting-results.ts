import { prisma } from "@/lib/db";
import {
  loadEventVotingTabulation,
  type VotingCategoryTabulation,
} from "@/lib/event-reports/voting-tabulation";
import { loadVehicleEntryMetaMap } from "@/lib/event-reports/vehicle-entry-meta";
import { applyTopN, REPORT_TOP_N } from "@/lib/event-reports/format";
import { csvRow } from "@/lib/event-reports/csv";
import { loadEventVotingControl } from "@/lib/judging/event-voting-control";
import {
  publicVotingReportStatus,
  type ReportVotingMethodStatus,
} from "@/lib/event-reports/voting-method-status";

export type PublicVotingResultRow = {
  rank: number;
  vehicleEntryCode: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  ownerName: string;
  vehicleClass: string;
  webVotes: number;
  smsVotes: number;
  totalVotes: number;
  percentOfCategory: string;
  isTied: boolean;
  lastVoteAt: string;
};

export type PublicVotingCategoryResults = {
  categoryId: string;
  categoryName: string;
  totalVotes: number;
  totalShown: number;
  totalRanked: number;
  topN: number;
  rows: PublicVotingResultRow[];
};

export type PublicVotingResultsReport = {
  generatedAt: string;
  showAll: boolean;
  votingStatus: ReportVotingMethodStatus;
  categories: PublicVotingCategoryResults[];
};

function markTies<T extends { totalVotes: number; rank: number }>(
  rows: T[],
): (T & { isTied: boolean })[] {
  const voteCounts = rows.map((r) => r.totalVotes);
  return rows.map((row) => ({
    ...row,
    isTied: voteCounts.filter((v) => v === row.totalVotes).length > 1,
  }));
}

async function loadLastVoteAtByCategory(
  eventId: string,
): Promise<Map<string, Map<string, Date>>> {
  const [webVotes, smsVotes] = await Promise.all([
    prisma.vehiclePublicVote.findMany({
      where: { eventId },
      select: {
        votingCategoryId: true,
        vehicleEntryCode: true,
        createdAt: true,
      },
    }),
    prisma.smsVote.findMany({
      where: { eventId },
      select: {
        votingCategoryId: true,
        vehicleEntryCode: true,
        createdAt: true,
      },
    }),
  ]);

  const out = new Map<string, Map<string, Date>>();
  for (const v of [...webVotes, ...smsVotes]) {
    let cat = out.get(v.votingCategoryId);
    if (!cat) {
      cat = new Map();
      out.set(v.votingCategoryId, cat);
    }
    const prev = cat.get(v.vehicleEntryCode);
    if (!prev || v.createdAt > prev) {
      cat.set(v.vehicleEntryCode, v.createdAt);
    }
  }
  return out;
}

function enrichCategory(
  cat: VotingCategoryTabulation,
  metaMap: Awaited<ReturnType<typeof loadVehicleEntryMetaMap>>,
  lastVotes: Map<string, Date> | undefined,
  showAll: boolean,
): PublicVotingCategoryResults {
  const ranked = cat.rows.map((row) => {
    const meta = metaMap.get(row.vehicleEntryCode);
    const pct =
      cat.totalVotes > 0
        ? ((row.totalVotes / cat.totalVotes) * 100).toFixed(1)
        : "0.0";
    const last = lastVotes?.get(row.vehicleEntryCode);
    return {
      rank: row.rank,
      vehicleEntryCode: row.vehicleEntryCode,
      year: meta ? String(meta.year) : "",
      make: meta?.make ?? "",
      model: meta?.model ?? "",
      trim: meta?.trim ?? "",
      ownerName: meta?.ownerName ?? "",
      vehicleClass: meta?.vehicleClass ?? "",
      webVotes: row.webVotes,
      smsVotes: row.smsVotes,
      totalVotes: row.totalVotes,
      percentOfCategory: `${pct}%`,
      isTied: false,
      lastVoteAt: last ? last.toISOString() : "",
    };
  });

  const withTies = markTies(ranked);
  const sliced = applyTopN(withTies, showAll);

  return {
    categoryId: cat.categoryId,
    categoryName: cat.categoryName,
    totalVotes: cat.totalVotes,
    totalRanked: cat.rows.length,
    totalShown: sliced.length,
    topN: REPORT_TOP_N,
    rows: sliced,
  };
}

export async function loadPublicVotingResultsReport(
  eventId: string,
  options?: { showAll?: boolean },
): Promise<PublicVotingResultsReport> {
  const showAll = options?.showAll ?? false;
  const [tabulation, metaMap, lastByCategory, votingControl] = await Promise.all([
    loadEventVotingTabulation(eventId),
    loadVehicleEntryMetaMap(eventId),
    loadLastVoteAtByCategory(eventId),
    loadEventVotingControl(eventId),
  ]);

  const votingStatus = votingControl
    ? publicVotingReportStatus(votingControl.publicVoting)
    : "not_started";

  return {
    generatedAt: tabulation.generatedAt,
    showAll,
    votingStatus,
    categories: tabulation.categories.map((cat) =>
      enrichCategory(
        cat,
        metaMap,
        lastByCategory.get(cat.categoryId),
        showAll,
      ),
    ),
  };
}

export function buildPublicVotingResultsCsv(
  report: PublicVotingResultsReport,
): string {
  const header = [
    "category",
    "rank",
    "vehicle_entry_code",
    "year",
    "make",
    "model",
    "trim",
    "owner_name",
    "vehicle_class",
    "web_votes",
    "sms_votes",
    "total_votes",
    "percent_of_category",
    "tie",
    "last_vote_at",
  ];
  const lines = [header.join(",")];
  for (const cat of report.categories) {
    for (const row of cat.rows) {
      lines.push(
        csvRow([
          cat.categoryName,
          row.rank,
          row.vehicleEntryCode,
          row.year,
          row.make,
          row.model,
          row.trim,
          row.ownerName,
          row.vehicleClass,
          row.webVotes,
          row.smsVotes,
          row.totalVotes,
          row.percentOfCategory,
          row.isTied ? "yes" : "no",
          row.lastVoteAt,
        ]),
      );
    }
  }
  return lines.join("\n");
}

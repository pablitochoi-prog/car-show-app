import { prisma } from "@/lib/db";
import { aggregateJudgeBallotResults } from "@/lib/judging/judge-ballot-results";
import { loadVehicleEntryMetaMap } from "@/lib/event-reports/vehicle-entry-meta";
import { applyTopN, REPORT_TOP_N } from "@/lib/event-reports/format";
import { csvRow } from "@/lib/event-reports/csv";

export type JudgeBallotResultReportRow = {
  rank: number;
  vehicleEntryCode: string;
  year: string;
  make: string;
  model: string;
  ownerName: string;
  vehicleClass: string;
  totalVotes: number;
  judgeCount: number;
  avgVotesPerJudge: string;
  isTied: boolean;
};

export type JudgeBallotCategoryResults = {
  categoryId: string;
  categoryName: string;
  status: string;
  totalRanked: number;
  totalShown: number;
  topN: number;
  rows: JudgeBallotResultReportRow[];
};

export type JudgeBallotResultsReport = {
  generatedAt: string;
  showAll: boolean;
  categories: JudgeBallotCategoryResults[];
};

export async function loadJudgeBallotResultsReport(
  eventId: string,
  options?: { showAll?: boolean },
): Promise<JudgeBallotResultsReport> {
  const showAll = options?.showAll ?? false;
  const [categories, metaMap] = await Promise.all([
    prisma.judgeBallotCategory.findMany({
      where: { eventId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, status: true },
    }),
    loadVehicleEntryMetaMap(eventId),
  ]);

  const enriched: JudgeBallotCategoryResults[] = [];
  for (const cat of categories) {
    const results = await aggregateJudgeBallotResults(cat.id);
    const rows: JudgeBallotResultReportRow[] = results.map((r) => {
      const meta = metaMap.get(r.vehicleEntryCode);
      const avg =
        r.judgeCount > 0
          ? (r.totalVotes / r.judgeCount).toFixed(2)
          : "0";
      return {
        rank: r.rank,
        vehicleEntryCode: r.vehicleEntryCode,
        year: meta ? String(meta.year) : String(r.year),
        make: meta?.make ?? r.make,
        model: meta?.model ?? r.model,
        ownerName: meta?.ownerName ?? "",
        vehicleClass: meta?.vehicleClass ?? r.vehicleClass,
        totalVotes: r.totalVotes,
        judgeCount: r.judgeCount,
        avgVotesPerJudge: avg,
        isTied: r.isTied,
      };
    });
    const sliced = applyTopN(rows, showAll);
    enriched.push({
      categoryId: cat.id,
      categoryName: cat.name,
      status: cat.status,
      totalRanked: rows.length,
      totalShown: sliced.length,
      topN: REPORT_TOP_N,
      rows: sliced,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    showAll,
    categories: enriched,
  };
}

export function buildJudgeBallotResultsCsv(
  report: JudgeBallotResultsReport,
): string {
  const header = [
    "ballot_category",
    "category_status",
    "rank",
    "vehicle_entry_code",
    "year",
    "make",
    "model",
    "owner_name",
    "vehicle_class",
    "total_votes",
    "judge_count",
    "avg_votes_per_judge",
    "tie",
  ];
  const lines = [header.join(",")];
  for (const cat of report.categories) {
    for (const row of cat.rows) {
      lines.push(
        csvRow([
          cat.categoryName,
          cat.status,
          row.rank,
          row.vehicleEntryCode,
          row.year,
          row.make,
          row.model,
          row.ownerName,
          row.vehicleClass,
          row.totalVotes,
          row.judgeCount,
          row.avgVotesPerJudge,
          row.isTied ? "yes" : "no",
        ]),
      );
    }
  }
  return lines.join("\n");
}

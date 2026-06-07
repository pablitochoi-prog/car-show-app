import { prisma } from "@/lib/db";
import { loadAwardTrophyWinners } from "@/lib/judging/award-trophy-winners";
import { csvRow } from "@/lib/event-reports/csv";

export type AwardsWinnerRow = {
  awardCategory: string;
  placement: string;
  vehicleEntryCode: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  ownerName: string;
  ownerLocation: string;
  vehicleClass: string;
  winningMetric: string;
  source: string;
  tieStatus: string;
  notes: string;
};

export type AwardsWinnersReport = {
  generatedAt: string;
  isProjected: boolean;
  awardsFinalizedAt: string | null;
  rows: AwardsWinnerRow[];
  announcerLines: string[];
};

function sourceLabel(source: string): string {
  switch (source) {
    case "score_sheet":
      return "Score Sheet";
    case "judge_ballot":
      return "Judge Ballot";
    case "public_vote":
      return "Public Vote";
    default:
      return "Manual / Unconfigured";
  }
}

export async function loadAwardsWinnersReport(
  eventId: string,
): Promise<AwardsWinnersReport | null> {
  const [event, payload] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      select: {
        eventAwardsVotingStatus: true,
        eventAwardsVotingFinalizedAt: true,
      },
    }),
    loadAwardTrophyWinners(eventId, { includeRankedList: false }),
  ]);

  if (!event || !payload) return null;

  const isProjected = event.eventAwardsVotingStatus !== "FINALIZED";
  const rows: AwardsWinnerRow[] = [];
  const announcerLines: string[] = [];

  for (const group of payload.groups) {
    for (const slot of group.placeSlots) {
      const w = slot.effectiveWinner;
      const vacant = slot.isVacant || !w;
      const placement = slot.placeLabel;
      const metric = w
        ? `${w.metricLabel}: ${w.metricValue ?? "—"}`
        : vacant
          ? "Vacant"
          : "—";

      rows.push({
        awardCategory: group.awardName,
        placement,
        vehicleEntryCode: w?.vehicleEntryCode ?? "",
        year: w ? String(w.year) : "",
        make: w?.make ?? "",
        model: w?.model ?? "",
        trim: "",
        ownerName: w?.ownerName ?? "",
        ownerLocation: "",
        vehicleClass: w?.vehicleClass ?? "",
        winningMetric: metric,
        source: sourceLabel(group.rankingSource),
        tieStatus: "—",
        notes: vacant ? "Vacant placement" : group.sourceHint,
      });

      if (w && !vacant) {
        const loc = "";
        announcerLines.push(
          `${group.awardName}: ${placement} — ${w.vehicleEntryCode} — ${w.year} ${w.make} ${w.model}${w.ownerName ? ` — ${w.ownerName}` : ""}${loc ? ` — ${loc}` : ""}`,
        );
      } else if (vacant) {
        announcerLines.push(`${group.awardName}: ${placement} — Vacant`);
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    isProjected,
    awardsFinalizedAt: event.eventAwardsVotingFinalizedAt?.toISOString() ?? null,
    rows,
    announcerLines,
  };
}

export function buildAwardsWinnersCsv(report: AwardsWinnersReport): string {
  const header = [
    "award_category",
    "placement",
    "vehicle_entry_code",
    "year",
    "make",
    "model",
    "owner_name",
    "vehicle_class",
    "winning_metric",
    "source",
    "tie_status",
    "notes",
    "projected",
  ];
  return [
    header.join(","),
    ...report.rows.map((r) =>
      csvRow([
        r.awardCategory,
        r.placement,
        r.vehicleEntryCode,
        r.year,
        r.make,
        r.model,
        r.ownerName,
        r.vehicleClass,
        r.winningMetric,
        r.source,
        r.tieStatus,
        r.notes,
        report.isProjected ? "yes" : "no",
      ]),
    ),
  ].join("\n");
}

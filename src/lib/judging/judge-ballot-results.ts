import { prisma } from "@/lib/db";

export type JudgeBallotResultRow = {
  rank: number;
  vehicleEntryCode: string;
  vehicleNickname: string | null;
  year: number;
  make: string;
  model: string;
  vehicleClass: string;
  totalVotes: number;
  judgeCount: number;
  isTied: boolean;
};

export type JudgeBallotVoteSpreadRow = {
  judgeUserId: string;
  voteCount: number;
};

export type JudgeBallotResultDetail = JudgeBallotResultRow & {
  voteSpreadByJudge: JudgeBallotVoteSpreadRow[];
};

function categoryLabel(row: {
  customName: string | null;
  category: { name: string } | null;
} | null): string {
  if (!row) return "—";
  return row.customName?.trim() || row.category?.name || "—";
}

type VehicleVoteAggregate = {
  totalVotes: number;
  judges: Set<string>;
  spread: Map<string, number>;
};

function accumulateVotes(
  byVehicle: Map<string, VehicleVoteAggregate>,
  votes: Array<{
    judgeUserId: string;
    voteCount: number;
    vehicleEntryCode: string;
  }>,
): void {
  for (const v of votes) {
    const key = v.vehicleEntryCode;
    let row = byVehicle.get(key);
    if (!row) {
      row = { totalVotes: 0, judges: new Set(), spread: new Map() };
      byVehicle.set(key, row);
    }
    row.totalVotes += v.voteCount;
    row.judges.add(v.judgeUserId);
    row.spread.set(
      v.judgeUserId,
      (row.spread.get(v.judgeUserId) ?? 0) + v.voteCount,
    );
  }
}

function rankVehicleVoteAggregates(
  byVehicle: Map<string, VehicleVoteAggregate>,
  options?: { includeVoteSpread?: boolean },
): JudgeBallotResultDetail[] {
  const sorted = [...byVehicle.entries()].sort(
    (a, b) => b[1].totalVotes - a[1].totalVotes,
  );

  const results: JudgeBallotResultDetail[] = [];
  let rank = 0;
  let prevTotal: number | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const [code, agg] = sorted[i]!;
    if (prevTotal !== agg.totalVotes) {
      rank = i + 1;
      prevTotal = agg.totalVotes;
    }

    const nextTotal = sorted[i + 1]?.[1].totalVotes;
    const isTied =
      nextTotal === agg.totalVotes ||
      (i > 0 && sorted[i - 1]![1].totalVotes === agg.totalVotes);

    results.push({
      rank,
      vehicleEntryCode: code,
      vehicleNickname: null,
      year: 0,
      make: "—",
      model: "—",
      vehicleClass: "—",
      totalVotes: agg.totalVotes,
      judgeCount: agg.judges.size,
      isTied,
      voteSpreadByJudge: options?.includeVoteSpread
        ? [...agg.spread.entries()].map(([judgeUserId, voteCount]) => ({
            judgeUserId,
            voteCount,
          }))
        : [],
    });
  }

  return results;
}

/** Rank all ballot categories for an event in one vote query (report use). */
export async function aggregateJudgeBallotResultsForEvent(
  eventId: string,
  categoryIds: string[],
): Promise<Map<string, JudgeBallotResultRow[]>> {
  const result = new Map<string, JudgeBallotResultRow[]>();
  if (categoryIds.length === 0) return result;

  for (const categoryId of categoryIds) {
    result.set(categoryId, []);
  }

  const votes = await prisma.judgeBallotVote.findMany({
    where: {
      eventId,
      categoryId: { in: categoryIds },
      voteCount: { gt: 0 },
      status: "SUBMITTED",
    },
    select: {
      categoryId: true,
      judgeUserId: true,
      voteCount: true,
      vehicleEntryCode: true,
    },
  });

  const byCategory = new Map<string, Map<string, VehicleVoteAggregate>>();
  for (const categoryId of categoryIds) {
    byCategory.set(categoryId, new Map());
  }

  for (const vote of votes) {
    const categoryMap = byCategory.get(vote.categoryId);
    if (!categoryMap) continue;
    accumulateVotes(categoryMap, [vote]);
  }

  for (const [categoryId, vehicleMap] of byCategory) {
    result.set(categoryId, rankVehicleVoteAggregates(vehicleMap));
  }

  return result;
}

/** Rank vehicles by total assigned judge votes within a ballot category. */
export async function aggregateJudgeBallotResults(
  categoryId: string,
  options?: { includeVoteSpread?: boolean },
): Promise<JudgeBallotResultDetail[]> {
  const votes = await prisma.judgeBallotVote.findMany({
    where: {
      categoryId,
      voteCount: { gt: 0 },
      status: "SUBMITTED",
    },
    select: {
      judgeUserId: true,
      voteCount: true,
      vehicleEntryCode: true,
      registrationVehicleId: true,
      registrationId: true,
    },
  });

  if (votes.length === 0) return [];

  const byVehicle = new Map<string, VehicleVoteAggregate>();
  accumulateVotes(byVehicle, votes);

  const entryCodes = [...byVehicle.keys()];
  const indexRows = await prisma.vehicleEntryIndex.findMany({
    where: { publicVehicleId: { in: entryCodes } },
    select: {
      publicVehicleId: true,
      registrationVehicleId: true,
      registrationId: true,
      guestVehicleIndex: true,
    },
  });

  const indexByCode = new Map(
    indexRows.map((r) => [r.publicVehicleId, r]),
  );

  const regVehicleIds = indexRows
    .map((r) => r.registrationVehicleId)
    .filter((id): id is string => id != null);

  const regVehicles = regVehicleIds.length
    ? await prisma.registrationVehicle.findMany({
        where: { id: { in: regVehicleIds } },
        include: {
          vehicle: { select: { year: true, make: true, model: true, nickname: true } },
          eventCategory: {
            include: { category: { select: { name: true } } },
          },
        },
      })
    : [];

  const rvById = new Map(regVehicles.map((rv) => [rv.id, rv]));

  const registrationIds = [
    ...new Set(indexRows.map((r) => r.registrationId).filter(Boolean)),
  ] as string[];

  const registrations = registrationIds.length
    ? await prisma.registration.findMany({
        where: { id: { in: registrationIds } },
        select: { id: true, guestVehicles: true },
      })
    : [];
  const regById = new Map(registrations.map((r) => [r.id, r]));

  type VehicleMeta = {
    vehicleNickname: string | null;
    year: number;
    make: string;
    model: string;
    vehicleClass: string;
  };

  function resolveMeta(code: string): VehicleMeta {
    const idx = indexByCode.get(code);
    if (!idx) {
      return {
        vehicleNickname: null,
        year: 0,
        make: "—",
        model: "—",
        vehicleClass: "—",
      };
    }

    if (idx.registrationVehicleId) {
      const rv = rvById.get(idx.registrationVehicleId);
      if (rv) {
        return {
          vehicleNickname:
            rv.vehicleNickname?.trim() || rv.vehicle.nickname?.trim() || null,
          year: rv.vehicle.year,
          make: rv.vehicle.make,
          model: rv.vehicle.model,
          vehicleClass: categoryLabel(rv.eventCategory),
        };
      }
    }

    const reg = regById.get(idx.registrationId);
    if (reg && idx.guestVehicleIndex != null && Array.isArray(reg.guestVehicles)) {
      const gv = (reg.guestVehicles as Array<Record<string, unknown>>)[
        idx.guestVehicleIndex
      ];
      if (gv) {
        return {
          vehicleNickname:
            typeof gv.nickname === "string" ? gv.nickname.trim() || null : null,
          year: typeof gv.year === "number" ? gv.year : 0,
          make: typeof gv.make === "string" ? gv.make : "—",
          model: typeof gv.model === "string" ? gv.model : "—",
          vehicleClass: "—",
        };
      }
    }

    return {
      vehicleNickname: null,
      year: 0,
      make: "—",
      model: "—",
      vehicleClass: "—",
    };
  }

  const ranked = rankVehicleVoteAggregates(byVehicle, options);
  return ranked.map((row) => {
    const meta = resolveMeta(row.vehicleEntryCode);
    return { ...row, ...meta };
  });
}

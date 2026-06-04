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

  const byVehicle = new Map<
    string,
    { totalVotes: number; judges: Set<string>; spread: Map<string, number> }
  >();

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
    const isTied = nextTotal === agg.totalVotes || (i > 0 && sorted[i - 1]![1].totalVotes === agg.totalVotes);

    const meta = resolveMeta(code);
    const row: JudgeBallotResultDetail = {
      rank,
      vehicleEntryCode: code,
      ...meta,
      totalVotes: agg.totalVotes,
      judgeCount: agg.judges.size,
      isTied,
      voteSpreadByJudge: options?.includeVoteSpread
        ? [...agg.spread.entries()].map(([judgeUserId, voteCount]) => ({
            judgeUserId,
            voteCount,
          }))
        : [],
    };
    results.push(row);
  }

  return results;
}

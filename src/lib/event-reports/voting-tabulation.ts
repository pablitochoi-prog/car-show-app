import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { GuestVehicleRecord } from "@/lib/event-sms-vehicle-id";

export type VotingTabulationRow = {
  vehicleEntryCode: string;
  vehicleLabel: string;
  webVotes: number;
  smsVotes: number;
  totalVotes: number;
  rank: number;
};

export type VotingCategoryTabulation = {
  categoryId: string;
  categoryName: string;
  smsOptionNumber: number;
  totalWebVotes: number;
  totalSmsVotes: number;
  totalVotes: number;
  rows: VotingTabulationRow[];
};

export type EventVotingTabulation = {
  categories: VotingCategoryTabulation[];
  generatedAt: string;
};

function formatVehicleLabel(parts: {
  year?: number | null;
  make?: string | null;
  model?: string | null;
  nickname?: string | null;
}): string {
  const base = [parts.year, parts.make, parts.model]
    .filter(Boolean)
    .join(" ")
    .trim();
  const nick = parts.nickname?.trim();
  if (base && nick) return `${base} (“${nick}”)`;
  return base || nick || "Vehicle";
}

async function loadVehicleLabelsForEvent(
  eventId: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  const registrationVehicles = await prisma.registrationVehicle.findMany({
    where: { registration: { eventId } },
    select: {
      publicVehicleId: true,
      vehicle: {
        select: {
          year: true,
          make: true,
          model: true,
          nickname: true,
        },
      },
    },
  });

  for (const rv of registrationVehicles) {
    const code = rv.publicVehicleId?.trim();
    if (!code) continue;
    map.set(code, formatVehicleLabel(rv.vehicle));
  }

  const guestRegs = await prisma.registration.findMany({
    where: { eventId, guestVehicles: { not: Prisma.DbNull } },
    select: { guestVehicles: true },
  });

  for (const reg of guestRegs) {
    const list = Array.isArray(reg.guestVehicles)
      ? (reg.guestVehicles as GuestVehicleRecord[])
      : [];
    for (const gv of list) {
      const code = gv.publicVehicleId?.trim();
      if (!code) continue;
      map.set(
        code,
        formatVehicleLabel({
          year: gv.year,
          make: gv.make,
          model: gv.model,
          nickname: gv.nickname,
        }),
      );
    }
  }

  return map;
}

function buildRowsForCategory(
  webCounts: Map<string, number>,
  smsCounts: Map<string, number>,
  labelMap: Map<string, string>,
): Pick<
  VotingCategoryTabulation,
  "totalWebVotes" | "totalSmsVotes" | "totalVotes" | "rows"
> {
  const codes = new Set<string>([...webCounts.keys(), ...smsCounts.keys()]);

  type Scratch = {
    vehicleEntryCode: string;
    webVotes: number;
    smsVotes: number;
    totalVotes: number;
  };

  const scratch: Scratch[] = [];
  for (const code of codes) {
    const webVotes = webCounts.get(code) ?? 0;
    const smsVotes = smsCounts.get(code) ?? 0;
    if (webVotes === 0 && smsVotes === 0) continue;
    scratch.push({
      vehicleEntryCode: code,
      webVotes,
      smsVotes,
      totalVotes: webVotes + smsVotes,
    });
  }

  scratch.sort((a, b) => {
    if (b.totalVotes !== a.totalVotes) return b.totalVotes - a.totalVotes;
    return a.vehicleEntryCode.localeCompare(b.vehicleEntryCode);
  });

  let totalWebVotes = 0;
  let totalSmsVotes = 0;
  const rows: VotingTabulationRow[] = scratch.map((entry, index) => {
    totalWebVotes += entry.webVotes;
    totalSmsVotes += entry.smsVotes;
    return {
      vehicleEntryCode: entry.vehicleEntryCode,
      vehicleLabel: labelMap.get(entry.vehicleEntryCode) ?? entry.vehicleEntryCode,
      webVotes: entry.webVotes,
      smsVotes: entry.smsVotes,
      totalVotes: entry.totalVotes,
      rank: index + 1,
    };
  });

  return {
    totalWebVotes,
    totalSmsVotes,
    totalVotes: totalWebVotes + totalSmsVotes,
    rows,
  };
}

export async function loadEventVotingTabulation(
  eventId: string,
): Promise<EventVotingTabulation> {
  const [categories, webGrouped, smsGrouped, labelMap] = await Promise.all([
    prisma.votingCategory.findMany({
      where: { eventId },
      orderBy: { smsOptionNumber: "asc" },
      select: {
        id: true,
        name: true,
        smsOptionNumber: true,
      },
    }),
    prisma.vehiclePublicVote.groupBy({
      by: ["vehicleEntryCode", "votingCategoryId"],
      where: { eventId },
      _count: { _all: true },
    }),
    prisma.smsVote.groupBy({
      by: ["vehicleEntryCode", "votingCategoryId"],
      where: { eventId },
      _count: { _all: true },
    }),
    loadVehicleLabelsForEvent(eventId),
  ]);

  const webByCategory = new Map<string, Map<string, number>>();
  for (const row of webGrouped) {
    let bucket = webByCategory.get(row.votingCategoryId);
    if (!bucket) {
      bucket = new Map();
      webByCategory.set(row.votingCategoryId, bucket);
    }
    bucket.set(row.vehicleEntryCode, row._count._all);
  }

  const smsByCategory = new Map<string, Map<string, number>>();
  for (const row of smsGrouped) {
    let bucket = smsByCategory.get(row.votingCategoryId);
    if (!bucket) {
      bucket = new Map();
      smsByCategory.set(row.votingCategoryId, bucket);
    }
    bucket.set(row.vehicleEntryCode, row._count._all);
  }

  const categoryTabulations: VotingCategoryTabulation[] = categories.map(
    (cat) => {
      const built = buildRowsForCategory(
        webByCategory.get(cat.id) ?? new Map(),
        smsByCategory.get(cat.id) ?? new Map(),
        labelMap,
      );
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        smsOptionNumber: cat.smsOptionNumber,
        ...built,
      };
    },
  );

  return {
    categories: categoryTabulations,
    generatedAt: new Date().toISOString(),
  };
}

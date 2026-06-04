import { CATEGORY_PLACE_LABELS } from "@/lib/event-awards-trophies";
import { prisma } from "@/lib/db";
import {
  buildEventAwardTrophyEntries,
  parseAwardTrophyEntryId,
} from "@/lib/event-awards-trophies";
import { pickAutoWinnerForPlace } from "@/lib/judging/award-trophy-place-pick";
import {
  rankCategoryAwardPool,
  rankSpecialAwardPool,
  type RankedTrophyVehicle,
  type TrophyWinnerRankingSource,
  TROPHY_WINNERS_LIST_SIZE,
} from "@/lib/judging/award-trophy-ranking";
import { loadEventVotingControl } from "@/lib/judging/event-voting-control";

export { TROPHY_WINNERS_LIST_SIZE } from "@/lib/judging/award-trophy-match";
export type { RankedTrophyVehicle, TrophyWinnerRankingSource };

export { normalizeAwardNameForMatch } from "@/lib/judging/award-trophy-match";

export type TrophyPlaceSlot = {
  trophyEntryId: string;
  placeLabel: string;
  placeIndex: number;
  effectiveWinner: RankedTrophyVehicle | null;
  isVacant: boolean;
  excludedEntryCodes: string[];
};

export type TrophyAwardGroup = {
  groupId: string;
  awardName: string;
  kind: "category" | "special";
  rankingSource: TrophyWinnerRankingSource;
  sourceHint: string;
  rankedVehicles: TrophyWinnerListVehicle[];
  placeSlots: TrophyPlaceSlot[];
};

export type AwardTrophyWinnersPayload = {
  judgingFinalized: boolean;
  groups: TrophyAwardGroup[];
};

type PlacementRow = {
  trophyEntryId: string;
  vehicleEntryCode: string | null;
  isVacant: boolean;
  excludedVehicleEntryCodes: string[];
};

function sourceHint(source: TrophyWinnerRankingSource): string {
  switch (source) {
    case "score_sheet":
      return "Score sheet judging (highest score first)";
    case "judge_ballot":
      return "Judge ballot votes";
    case "public_vote":
      return "People's choice / public voting";
    default:
      return "Link a judging class to this vehicle class, or match a ballot / voting category name.";
  }
}

function resolveEffectiveForPlace(
  vehicles: RankedTrophyVehicle[],
  placeIndex: number,
  placement: PlacementRow | undefined,
): { code: string | null; isVacant: boolean } {
  const excluded = new Set(placement?.excludedVehicleEntryCodes ?? []);
  if (placement?.isVacant && !placement.vehicleEntryCode) {
    return { code: null, isVacant: true };
  }
  const manual = placement?.vehicleEntryCode?.trim() || null;
  if (manual && !excluded.has(manual)) {
    return { code: manual, isVacant: false };
  }
  const auto = pickAutoWinnerForPlace(vehicles, placeIndex, excluded);
  return { code: auto, isVacant: false };
}

function vehicleByCode(
  vehicles: RankedTrophyVehicle[],
  code: string | null,
): RankedTrophyVehicle | null {
  if (!code) return null;
  return vehicles.find((v) => v.vehicleEntryCode === code) ?? null;
}

export type TrophyWinnerListVehicle = RankedTrophyVehicle & {
  isAutoWinner: boolean;
  isSelectedWinner: boolean;
  isAlternate: boolean;
};

function attachListFlags(
  vehicles: RankedTrophyVehicle[],
  placeSlots: TrophyPlaceSlot[],
): TrophyWinnerListVehicle[] {
  return vehicles.map((v) => {
    const winningSlot = placeSlots.find(
      (s) => s.effectiveWinner?.vehicleEntryCode === v.vehicleEntryCode,
    );
    const isSelectedWinner = !!winningSlot;
    let isAutoWinner = false;
    if (winningSlot) {
      const auto = pickAutoWinnerForPlace(
        vehicles,
        winningSlot.placeIndex,
        new Set(winningSlot.excludedEntryCodes),
      );
      isAutoWinner = auto === v.vehicleEntryCode;
    }
    return {
      ...v,
      isSelectedWinner,
      isAutoWinner,
      isAlternate: !isSelectedWinner,
    };
  });
}

export async function loadAwardTrophyWinners(
  eventId: string,
): Promise<AwardTrophyWinnersPayload | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      eventCategories: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          trophyCount: true,
          customName: true,
          category: { select: { name: true } },
        },
      },
      eventAwards: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          customName: true,
          specialAward: { select: { name: true } },
        },
      },
    },
  });
  if (!event) return null;

  const categories = event.eventCategories.map((c) => ({
    id: c.id,
    name: c.customName?.trim() || c.category?.name || "Category",
    trophyCount: c.trophyCount,
  }));

  const entries = buildEventAwardTrophyEntries({
    categories,
    specialAwards: event.eventAwards.map((a) => ({
      id: a.id,
      name: a.specialAward?.name ?? a.customName ?? "Custom Award",
    })),
  });

  const placements = await prisma.eventTrophyPlacement.findMany({
    where: { eventId },
  });
  const placementByEntryId = new Map(
    placements.map((p) => [p.trophyEntryId, p]),
  );

  const categoryPools = new Map<
    string,
    { vehicles: RankedTrophyVehicle[]; source: TrophyWinnerRankingSource }
  >();
  const specialPools = new Map<
    string,
    { vehicles: RankedTrophyVehicle[]; source: TrophyWinnerRankingSource }
  >();

  const groups: TrophyAwardGroup[] = [];

  const categoryIdsWithTrophies = new Set(
    entries
      .map((e) => parseAwardTrophyEntryId(e.id))
      .filter((p) => p?.kind === "category_place")
      .map((p) => (p!.kind === "category_place" ? p.eventCategoryId : "")),
  );

  for (const cat of categories) {
    const catId = cat.id;
    if (!categoryIdsWithTrophies.has(catId)) continue;
    const awardName = `Best ${cat.name}`;
    const pool = await rankCategoryAwardPool(eventId, catId);
    categoryPools.set(catId, pool);

    const catEntries = entries.filter((e) => {
      const p = parseAwardTrophyEntryId(e.id);
      return p?.kind === "category_place" && p.eventCategoryId === catId;
    });

    const placeSlots: TrophyPlaceSlot[] = catEntries.map((entry) => {
      const placeIndex = entry.placeIndex ?? 0;
      const placement = placementByEntryId.get(entry.id);
      const { code, isVacant } = resolveEffectiveForPlace(
        pool.vehicles,
        placeIndex,
        placement,
      );
      return {
        trophyEntryId: entry.id,
        placeLabel:
          CATEGORY_PLACE_LABELS[placeIndex] ?? `${placeIndex + 1}th Place`,
        placeIndex,
        effectiveWinner: vehicleByCode(pool.vehicles, code),
        isVacant,
        excludedEntryCodes: placement?.excludedVehicleEntryCodes ?? [],
      };
    });

    groups.push({
      groupId: `cat:${catId}`,
      awardName,
      kind: "category",
      rankingSource: pool.source,
      sourceHint: sourceHint(pool.source),
      rankedVehicles: attachListFlags(pool.vehicles, placeSlots),
      placeSlots,
    });
  }

  const specialIdsWithTrophies = new Set(
    entries
      .map((e) => parseAwardTrophyEntryId(e.id))
      .filter((p) => p?.kind === "special")
      .map((p) => (p!.kind === "special" ? p.eventAwardId : "")),
  );

  for (const award of event.eventAwards) {
    const awardId = award.id;
    if (!specialIdsWithTrophies.has(awardId)) continue;
    const awardName =
      award?.specialAward?.name ?? award?.customName ?? "Special award";
    let pool = specialPools.get(awardId);
    if (!pool) {
      pool = await rankSpecialAwardPool(eventId, awardName);
      specialPools.set(awardId, pool);
    }

    const entry = entries.find((e) => {
      const p = parseAwardTrophyEntryId(e.id);
      return p?.kind === "special" && p.eventAwardId === awardId;
    });
    if (!entry) continue;

    const placement = placementByEntryId.get(entry.id);
    const { code, isVacant } = resolveEffectiveForPlace(
      pool.vehicles,
      0,
      placement,
    );
    const placeSlots: TrophyPlaceSlot[] = [
      {
        trophyEntryId: entry.id,
        placeLabel: "Winner",
        placeIndex: 0,
        effectiveWinner: vehicleByCode(pool.vehicles, code),
        isVacant,
        excludedEntryCodes: placement?.excludedVehicleEntryCodes ?? [],
      },
    ];

    groups.push({
      groupId: `award:${awardId}`,
      awardName,
      kind: "special",
      rankingSource: pool.source,
      sourceHint: sourceHint(pool.source),
      rankedVehicles: attachListFlags(pool.vehicles, placeSlots),
      placeSlots,
    });
  }

  const votingControl = await loadEventVotingControl(eventId);

  return {
    judgingFinalized: votingControl?.trophyWinnersEnabled ?? false,
    groups,
  };
}

export class AwardTrophyPlacementError extends Error {
  constructor(
    message: string,
    public code: "NOT_FOUND" | "NOT_FINALIZED" | "INVALID" = "INVALID",
  ) {
    super(message);
    this.name = "AwardTrophyPlacementError";
  }
}

export async function excludeTrophyPlaceWinner(
  eventId: string,
  trophyEntryId: string,
): Promise<void> {
  const payload = await loadAwardTrophyWinners(eventId);
  if (!payload?.judgingFinalized) {
    throw new AwardTrophyPlacementError(
      "Finalize all event voting before assigning trophy winners.",
      "NOT_FINALIZED",
    );
  }

  const group = payload.groups.find((g) =>
    g.placeSlots.some((s) => s.trophyEntryId === trophyEntryId),
  );
  const slot = group?.placeSlots.find((s) => s.trophyEntryId === trophyEntryId);
  if (!group || !slot) {
    throw new AwardTrophyPlacementError("Invalid trophy entry.", "INVALID");
  }

  const currentCode = slot.effectiveWinner?.vehicleEntryCode;
  if (!currentCode) {
    throw new AwardTrophyPlacementError("No winner to exclude.", "INVALID");
  }

  const existing = await prisma.eventTrophyPlacement.findUnique({
    where: {
      eventId_trophyEntryId: { eventId, trophyEntryId },
    },
  });

  const excluded = [
    ...new Set([
      ...(existing?.excludedVehicleEntryCodes ?? []),
      currentCode,
    ]),
  ];

  const nextCode = pickAutoWinnerForPlace(
    group.rankedVehicles,
    slot.placeIndex,
    new Set(excluded),
  );

  await prisma.eventTrophyPlacement.upsert({
    where: {
      eventId_trophyEntryId: { eventId, trophyEntryId },
    },
    create: {
      eventId,
      trophyEntryId,
      vehicleEntryCode: nextCode,
      isVacant: !nextCode,
      excludedVehicleEntryCodes: excluded,
    },
    update: {
      vehicleEntryCode: nextCode,
      isVacant: !nextCode,
      excludedVehicleEntryCodes: excluded,
    },
  });
}

export async function upsertAwardTrophyPlacement(
  eventId: string,
  input: {
    trophyEntryId: string;
    vehicleEntryCode?: string | null;
    isVacant?: boolean;
    clearSelection?: boolean;
    excludeWinner?: boolean;
  },
): Promise<void> {
  if (input.excludeWinner) {
    await excludeTrophyPlaceWinner(eventId, input.trophyEntryId);
    return;
  }

  const votingControl = await loadEventVotingControl(eventId);
  if (!votingControl?.trophyWinnersEnabled) {
    throw new AwardTrophyPlacementError(
      "Finalize all event voting before assigning trophy winners.",
      "NOT_FINALIZED",
    );
  }

  const parsed = parseAwardTrophyEntryId(input.trophyEntryId);
  if (!parsed) {
    throw new AwardTrophyPlacementError("Invalid trophy entry.", "INVALID");
  }

  if (input.clearSelection) {
    await prisma.eventTrophyPlacement.deleteMany({
      where: { eventId, trophyEntryId: input.trophyEntryId },
    });
    return;
  }

  const isVacant = input.isVacant === true;
  const vehicleEntryCode = isVacant
    ? null
    : input.vehicleEntryCode?.trim() || null;

  if (!isVacant && !vehicleEntryCode) {
    throw new AwardTrophyPlacementError(
      "Select a vehicle or mark the trophy vacant.",
      "INVALID",
    );
  }

  const existing = await prisma.eventTrophyPlacement.findUnique({
    where: {
      eventId_trophyEntryId: { eventId, trophyEntryId: input.trophyEntryId },
    },
  });

  await prisma.eventTrophyPlacement.upsert({
    where: {
      eventId_trophyEntryId: { eventId, trophyEntryId: input.trophyEntryId },
    },
    create: {
      eventId,
      trophyEntryId: input.trophyEntryId,
      vehicleEntryCode,
      isVacant,
      excludedVehicleEntryCodes: existing?.excludedVehicleEntryCodes ?? [],
    },
    update: {
      vehicleEntryCode,
      isVacant,
    },
  });
}

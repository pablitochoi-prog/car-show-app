import { prisma } from "@/lib/db";
import { garagePhotoViewPath } from "@/lib/vehicle-photo-access";
import { loadAwardTrophyWinners } from "@/lib/judging/award-trophy-winners";
import { loadManualAwardsByVehicleIds } from "@/lib/vehicle-manual-awards";
import {
  awardsVisibleToOwnerAt,
  isEventAwardsVisibleToOwners,
  MY_AWARDS_CEREMONY_DELAY_MS,
} from "@/lib/my-vehicle-awards-publish";

export {
  awardsVisibleToOwnerAt,
  isEventAwardsVisibleToOwners,
  MY_AWARDS_CEREMONY_DELAY_MS,
};

export type MyVehicleAwardSource = "platform" | "manual";

export type MyVehicleAwardEntry = {
  id: string;
  source: MyVehicleAwardSource;
  awardName: string;
  /** Set for Car Show Scout events; null for owner-added external shows. */
  eventId: string | null;
  eventName: string;
  /** ISO date string for the event show day. */
  eventDateIso: string;
  eventDateLabel: string;
  organizationName: string | null;
  /** When this award became visible to the owner (finalize + 24h for platform). */
  publishedAtIso: string;
};

function sortAwardsNewestFirst(awards: MyVehicleAwardEntry[]): MyVehicleAwardEntry[] {
  return [...awards].sort((a, b) => {
    const dateCmp =
      new Date(b.eventDateIso).getTime() - new Date(a.eventDateIso).getTime();
    if (dateCmp !== 0) return dateCmp;
    return a.awardName.localeCompare(b.awardName);
  });
}

export type MyGarageVehicleAwardsSection = {
  vehicleId: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  nickname: string | null;
  photoUrl: string | null;
  awards: MyVehicleAwardEntry[];
};

function formatEventDate(startDate: Date): string {
  return startDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildAwardDisplayName(
  groupAwardName: string,
  placeLabel: string,
  kind: "category" | "special",
): string {
  if (kind === "special") return groupAwardName;
  return `${groupAwardName} — ${placeLabel}`;
}

/**
 * Load garage vehicles grouped with published trophy history (newest event first).
 */
export async function loadMyGarageAwards(
  userId: string,
): Promise<MyGarageVehicleAwardsSection[]> {
  const vehicles = await prisma.vehicle.findMany({
    where: { userId, archivedAt: null },
    orderBy: [{ year: "desc" }, { make: "asc" }, { model: "asc" }],
    select: {
      id: true,
      year: true,
      make: true,
      model: true,
      trim: true,
      nickname: true,
      photoUrl: true,
      photos: {
        where: { isPrimary: true, status: "READY" },
        take: 1,
        select: { id: true },
      },
    },
  });

  const entryRows = await prisma.registrationVehicle.findMany({
    where: {
      publicVehicleId: { not: null },
      registration: { userId },
      vehicle: { userId },
    },
    select: {
      publicVehicleId: true,
      vehicleId: true,
      registration: {
        select: {
          eventId: true,
          event: {
            select: {
              id: true,
              name: true,
              startDate: true,
              eventAwardsVotingStatus: true,
              eventAwardsVotingFinalizedAt: true,
              organization: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  const codeToVehicleId = new Map<string, string>();
  const eventMeta = new Map<
    string,
    {
      name: string;
      startDate: Date;
      organizationName: string | null;
      finalizedAt: Date;
      publishedAt: Date;
    }
  >();

  for (const row of entryRows) {
    const code = row.publicVehicleId?.trim();
    if (!code) continue;
    codeToVehicleId.set(code, row.vehicleId);

    const ev = row.registration.event;
    if (ev.eventAwardsVotingStatus !== "FINALIZED") continue;
    if (!ev.eventAwardsVotingFinalizedAt) continue;
    if (!isEventAwardsVisibleToOwners(ev.eventAwardsVotingFinalizedAt)) continue;

    if (!eventMeta.has(ev.id)) {
      eventMeta.set(ev.id, {
        name: ev.name,
        startDate: ev.startDate,
        organizationName: ev.organization?.name ?? null,
        finalizedAt: ev.eventAwardsVotingFinalizedAt,
        publishedAt: awardsVisibleToOwnerAt(ev.eventAwardsVotingFinalizedAt),
      });
    }
  }

  const awardsByVehicleId = new Map<string, MyVehicleAwardEntry[]>();

  for (const [eventId, meta] of eventMeta) {
    const payload = await loadAwardTrophyWinners(eventId);
    if (!payload?.judgingFinalized) continue;

    for (const group of payload.groups) {
      for (const slot of group.placeSlots) {
        if (slot.isVacant || !slot.effectiveWinner?.vehicleEntryCode) continue;
        const code = slot.effectiveWinner.vehicleEntryCode;
        const vehicleId = codeToVehicleId.get(code);
        if (!vehicleId) continue;

        const entry: MyVehicleAwardEntry = {
          id: `${eventId}:${slot.trophyEntryId}`,
          source: "platform",
          awardName: buildAwardDisplayName(
            group.awardName,
            slot.placeLabel,
            group.kind,
          ),
          eventId,
          eventName: meta.name,
          eventDateIso: meta.startDate.toISOString(),
          eventDateLabel: formatEventDate(meta.startDate),
          organizationName: meta.organizationName,
          publishedAtIso: meta.publishedAt.toISOString(),
        };

        const list = awardsByVehicleId.get(vehicleId) ?? [];
        list.push(entry);
        awardsByVehicleId.set(vehicleId, list);
      }
    }
  }

  const vehicleIds = vehicles.map((v) => v.id);
  const manualByVehicle = await loadManualAwardsByVehicleIds(userId, vehicleIds);

  const sections = vehicles.map((v) => {
    let photoUrl = v.photoUrl;
    const primary = v.photos[0];
    if (primary) {
      photoUrl = garagePhotoViewPath(v.id, primary.id);
    }

    return {
      vehicleId: v.id,
      year: v.year,
      make: v.make,
      model: v.model,
      trim: v.trim,
      nickname: v.nickname,
      photoUrl,
      awards: sortAwardsNewestFirst([
        ...(awardsByVehicleId.get(v.id) ?? []),
        ...(manualByVehicle.get(v.id) ?? []),
      ]),
    };
  });

  sections.sort((a, b) => {
    const aTime = a.awards[0]
      ? new Date(a.awards[0].eventDateIso).getTime()
      : 0;
    const bTime = b.awards[0]
      ? new Date(b.awards[0].eventDateIso).getTime()
      : 0;
    if (bTime !== aTime) return bTime - aTime;
    if (b.awards.length !== a.awards.length) return b.awards.length - a.awards.length;
    if (b.year !== a.year) return b.year - a.year;
    const makeCmp = a.make.localeCompare(b.make);
    if (makeCmp !== 0) return makeCmp;
    return a.model.localeCompare(b.model);
  });

  return sections;
}

/** Awards history for a single garage vehicle (My Vehicles view / My Awards). */
export async function loadGarageVehicleAwardsSection(
  userId: string,
  vehicleId: string,
): Promise<MyGarageVehicleAwardsSection | null> {
  const sections = await loadMyGarageAwards(userId);
  return sections.find((s) => s.vehicleId === vehicleId) ?? null;
}

export async function countTotalAwardsForUser(userId: string): Promise<number> {
  const sections = await loadMyGarageAwards(userId);
  return sections.reduce((sum, s) => sum + s.awards.length, 0);
}

/** @deprecated Use countTotalAwardsForUser */
export async function countPublishedAwardsForUser(userId: string): Promise<number> {
  return countTotalAwardsForUser(userId);
}

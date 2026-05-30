import type { EventStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { createHash, randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import {
  isCategoryVotingOpen,
  isSmsVotingOpenForEvent,
} from "@/lib/sms/voting-window";
import { isPublicVotingOpenForEvent } from "@/lib/vehicle-entry-access";
import type { VehicleEntryRecord } from "@/lib/vehicle-entry-types";

export const VOTE_FINGERPRINT_COOKIE = "css_vote_fp";

export type PublicVotingCategory = {
  id: string;
  name: string;
  smsOptionNumber: number;
  isOpen: boolean;
};

export type PublicVoteCategoryUiState =
  | "available"
  | "voted_here"
  | "used_elsewhere"
  | "other_category_on_vehicle"
  | "closed";

export type VisitorPublicVoteContext = {
  categories: PublicVotingCategory[];
  categoryStates: Record<string, PublicVoteCategoryUiState>;
  /** Category id if this visitor already voted for this vehicle. */
  votedCategoryIdOnVehicle: string | null;
  hasAnyOpenCategory: boolean;
};

export function entryAllowsPublicVoting(
  entry: VehicleEntryRecord,
  eventStatus: EventStatus,
): boolean {
  if (entry.votingStatus === "CLOSED") return false;
  return isPublicVotingOpenForEvent(eventStatus);
}

/** Read-only — safe in Server Components (never writes cookies). */
export async function readVoterFingerprint(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(VOTE_FINGERPRINT_COOKIE)?.value?.trim() ?? null;
}

/** Route handlers only — sets the fingerprint cookie when missing. */
export async function getOrCreateVoterKey(): Promise<string> {
  const jar = await cookies();
  let fp = jar.get(VOTE_FINGERPRINT_COOKIE)?.value?.trim();
  if (!fp) {
    fp = randomUUID();
    jar.set(VOTE_FINGERPRINT_COOKIE, fp, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });
  }
  return fp;
}

/** Event-scoped visitor id (same person across all vehicles at one show). */
export function buildEventVisitorKey(
  fingerprint: string,
  eventId: string,
): string {
  return createHash("sha256")
    .update(`${fingerprint}:${eventId}`)
    .digest("hex");
}

export async function loadOpenPublicVotingCategories(
  eventId: string,
  now: Date = new Date(),
): Promise<PublicVotingCategory[]> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      smsVotingEnabled: true,
      smsVotingStartsAt: true,
      smsVotingEndsAt: true,
      status: true,
      dailyHours: true,
    },
  });
  if (!event) return [];

  const eventOpen = event.smsVotingEnabled
    ? isSmsVotingOpenForEvent(event, now)
    : isPublicVotingOpenForEvent(event.status);

  const rows = await prisma.votingCategory.findMany({
    where: { eventId, isActive: true },
    orderBy: { smsOptionNumber: "asc" },
    select: {
      id: true,
      name: true,
      smsOptionNumber: true,
      isActive: true,
      votingStartsAt: true,
      votingEndsAt: true,
    },
  });

  if (rows.length > 0) {
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      smsOptionNumber: c.smsOptionNumber,
      isOpen: isCategoryVotingOpen(c, eventOpen, now),
    }));
  }

  if (!eventOpen) return [];

  return [
    {
      id: "default",
      name: "People's Choice",
      smsOptionNumber: 1,
      isOpen: true,
    },
  ];
}

export async function getVisitorPublicVoteContext(
  entry: VehicleEntryRecord,
  fingerprint: string | null,
): Promise<VisitorPublicVoteContext> {
  const categories = await loadOpenPublicVotingCategories(entry.eventId);

  const empty: VisitorPublicVoteContext = {
    categories,
    categoryStates: Object.fromEntries(
      categories.map((c) => [c.id, c.isOpen ? "available" : "closed"]),
    ),
    votedCategoryIdOnVehicle: null,
    hasAnyOpenCategory: categories.some((c) => c.isOpen),
  };

  if (!fingerprint) return empty;

  const visitorKey = buildEventVisitorKey(fingerprint, entry.eventId);
  const existing = await prisma.vehiclePublicVote.findMany({
    where: { eventId: entry.eventId, visitorKey },
    select: {
      votingCategoryId: true,
      vehicleEntryCode: true,
    },
  });

  const voteOnThisVehicle = existing.find(
    (v) => v.vehicleEntryCode === entry.vehicleEntryCode,
  );
  const votedCategoryIdOnVehicle = voteOnThisVehicle?.votingCategoryId ?? null;
  const usedCategoryIds = new Set(
    existing.map((v) => v.votingCategoryId),
  );

  const categoryStates: Record<string, PublicVoteCategoryUiState> = {};
  for (const cat of categories) {
    if (!cat.isOpen) {
      categoryStates[cat.id] = "closed";
    } else if (votedCategoryIdOnVehicle === cat.id) {
      categoryStates[cat.id] = "voted_here";
    } else if (
      votedCategoryIdOnVehicle &&
      votedCategoryIdOnVehicle !== cat.id
    ) {
      categoryStates[cat.id] = "other_category_on_vehicle";
    } else if (usedCategoryIds.has(cat.id)) {
      categoryStates[cat.id] = "used_elsewhere";
    } else {
      categoryStates[cat.id] = "available";
    }
  }

  return {
    categories,
    categoryStates,
    votedCategoryIdOnVehicle,
    hasAnyOpenCategory: categories.some((c) => c.isOpen),
  };
}

export async function recordPublicVote(
  entry: VehicleEntryRecord,
  fingerprint: string,
  votingCategoryId: string,
  userId: string | null,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!entryAllowsPublicVoting(entry, entry.event.status)) {
    return { ok: false, reason: "Voting is not open for this vehicle." };
  }

  const categories = await loadOpenPublicVotingCategories(entry.eventId);
  const category = categories.find((c) => c.id === votingCategoryId);
  if (!category) {
    return { ok: false, reason: "Invalid voting category." };
  }
  if (!category.isOpen) {
    return { ok: false, reason: `${category.name} voting is not open right now.` };
  }

  const visitorKey = buildEventVisitorKey(fingerprint, entry.eventId);

  const existing = await prisma.vehiclePublicVote.findMany({
    where: { eventId: entry.eventId, visitorKey },
    select: { votingCategoryId: true, vehicleEntryCode: true },
  });

  const onThisVehicle = existing.find(
    (v) => v.vehicleEntryCode === entry.vehicleEntryCode,
  );
  if (onThisVehicle) {
    if (onThisVehicle.votingCategoryId === votingCategoryId) {
      return {
        ok: false,
        reason: `You already voted ${category.name} for this vehicle.`,
      };
    }
    return {
      ok: false,
      reason:
        "You can only vote in one category per vehicle. Choose a different vehicle for your other category vote.",
    };
  }

  if (existing.some((v) => v.votingCategoryId === votingCategoryId)) {
    return {
      ok: false,
      reason: `You already used your ${category.name} vote for another vehicle at this show.`,
    };
  }

  const resolvedCategoryId =
    votingCategoryId === "default"
      ? (
          await prisma.votingCategory.findFirst({
            where: { eventId: entry.eventId, isActive: true },
            orderBy: { smsOptionNumber: "asc" },
            select: { id: true },
          })
        )?.id
      : votingCategoryId;

  if (!resolvedCategoryId) {
    return { ok: false, reason: "Voting is not configured for this event." };
  }

  try {
    await prisma.vehiclePublicVote.create({
      data: {
        eventId: entry.eventId,
        votingCategoryId: resolvedCategoryId,
        vehicleEntryCode: entry.vehicleEntryCode,
        registrationId: entry.registrationId,
        registrationVehicleId: entry.registrationVehicleId,
        visitorKey,
        userId,
      },
    });
    return { ok: true };
  } catch (e) {
    const isDuplicate =
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "P2002";
    if (isDuplicate) {
      return {
        ok: false,
        reason: "You have already cast this vote.",
      };
    }
    throw e;
  }
}

/** @deprecated Use getVisitorPublicVoteContext */
export async function hasExistingVisitorVote(
  entry: VehicleEntryRecord,
): Promise<boolean> {
  const fp = await readVoterFingerprint();
  if (!fp) return false;
  const ctx = await getVisitorPublicVoteContext(entry, fp);
  return ctx.votedCategoryIdOnVehicle != null;
}

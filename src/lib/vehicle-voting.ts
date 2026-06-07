import type { EventStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { createHash, randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import {
  getSmsVotingWindowStatus,
  isCategoryVotingOpen,
  isSmsVotingOpenForEvent,
} from "@/lib/sms/voting-window";
import { isPublicVotingOpenForEvent } from "@/lib/vehicle-entry-access";
import type { VehicleEntryRecord } from "@/lib/vehicle-entry-types";
import type { PublicVotingPeriodStatus } from "@/lib/vehicle-voting-types";

export type { PublicVotingPeriodStatus } from "@/lib/vehicle-voting-types";

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
  | "closed";

export type VisitorPublicVoteContext = {
  categories: PublicVotingCategory[];
  categoryStates: Record<string, PublicVoteCategoryUiState>;
  /** Category ids this visitor already voted for on this vehicle. */
  votedCategoryIdsOnVehicle: string[];
  hasAnyOpenCategory: boolean;
};

export async function resolvePublicVotingPeriodStatus(
  entry: VehicleEntryRecord,
  voteContext: VisitorPublicVoteContext,
): Promise<PublicVotingPeriodStatus> {
  if (entry.votingStatus === "CLOSED") return "ended";
  if (voteContext.hasAnyOpenCategory) return "open";

  const event = await prisma.event.findUnique({
    where: { id: entry.eventId },
    select: {
      smsVotingEnabled: true,
      smsVotingStartsAt: true,
      smsVotingEndsAt: true,
      status: true,
    },
  });
  if (!event) return "ended";

  if (event.smsVotingEnabled) {
    const window = getSmsVotingWindowStatus(event);
    if (window === "not_started") return "not_started";
    if (window === "open") return "open";
    return "ended";
  }

  if (!isPublicVotingOpenForEvent(event.status)) return "ended";
  if (voteContext.categories.length === 0) return "not_started";
  if (voteContext.hasAnyOpenCategory) return "open";
  return "ended";
}

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
    votedCategoryIdsOnVehicle: [],
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

  const votedCategoryIdsOnVehicle = existing
    .filter((v) => v.vehicleEntryCode === entry.vehicleEntryCode)
    .map((v) => v.votingCategoryId);
  const votedOnThisVehicle = new Set(votedCategoryIdsOnVehicle);
  const usedCategoryIds = new Set(
    existing.map((v) => v.votingCategoryId),
  );

  const categoryStates: Record<string, PublicVoteCategoryUiState> = {};
  for (const cat of categories) {
    if (!cat.isOpen) {
      categoryStates[cat.id] = "closed";
    } else if (votedOnThisVehicle.has(cat.id)) {
      categoryStates[cat.id] = "voted_here";
    } else if (usedCategoryIds.has(cat.id)) {
      categoryStates[cat.id] = "used_elsewhere";
    } else {
      categoryStates[cat.id] = "available";
    }
  }

  return {
    categories,
    categoryStates,
    votedCategoryIdsOnVehicle,
    hasAnyOpenCategory: categories.some((c) => c.isOpen),
  };
}

async function resolveVotingCategoryId(
  eventId: string,
  votingCategoryId: string,
): Promise<string | null> {
  if (votingCategoryId === "default") {
    return (
      (
        await prisma.votingCategory.findFirst({
          where: { eventId, isActive: true },
          orderBy: { smsOptionNumber: "asc" },
          select: { id: true },
        })
      )?.id ?? null
    );
  }
  return votingCategoryId;
}

/** Record one or more public votes for this vehicle (one ballot submission). */
export async function recordPublicVotes(
  entry: VehicleEntryRecord,
  fingerprint: string,
  votingCategoryIds: string[],
  userId: string | null,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (entry.votingStatus === "CLOSED") {
    return { ok: false, reason: "Voting is not open for this vehicle." };
  }

  const uniqueIds = [...new Set(votingCategoryIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { ok: false, reason: "Select at least one voting category." };
  }

  const categories = await loadOpenPublicVotingCategories(entry.eventId);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const visitorKey = buildEventVisitorKey(fingerprint, entry.eventId);
  const existing = await prisma.vehiclePublicVote.findMany({
    where: { eventId: entry.eventId, visitorKey },
    select: { votingCategoryId: true, vehicleEntryCode: true },
  });

  const resolvedIds: { id: string; name: string }[] = [];
  for (const rawId of uniqueIds) {
    const resolvedId = await resolveVotingCategoryId(entry.eventId, rawId);
    if (!resolvedId) {
      return { ok: false, reason: "Voting is not configured for this event." };
    }
    const category = categoryById.get(resolvedId) ?? categoryById.get(rawId);
    if (!category) {
      return { ok: false, reason: "Invalid voting category." };
    }
    if (!category.isOpen) {
      return {
        ok: false,
        reason: `${category.name} voting is not open right now.`,
      };
    }
    if (
      existing.some(
        (v) =>
          v.vehicleEntryCode === entry.vehicleEntryCode &&
          v.votingCategoryId === resolvedId,
      )
    ) {
      return {
        ok: false,
        reason: `You already voted ${category.name} for this vehicle.`,
      };
    }
    if (
      existing.some(
        (v) =>
          v.votingCategoryId === resolvedId &&
          v.vehicleEntryCode !== entry.vehicleEntryCode,
      )
    ) {
      return {
        ok: false,
        reason: `You already used your ${category.name} vote for another vehicle at this show.`,
      };
    }
    if (!resolvedIds.some((r) => r.id === resolvedId)) {
      resolvedIds.push({ id: resolvedId, name: category.name });
    }
  }

  try {
    await prisma.$transaction(
      resolvedIds.map((cat) =>
        prisma.vehiclePublicVote.create({
          data: {
            eventId: entry.eventId,
            votingCategoryId: cat.id,
            vehicleEntryCode: entry.vehicleEntryCode,
            registrationId: entry.registrationId,
            registrationVehicleId: entry.registrationVehicleId,
            visitorKey,
            userId,
          },
        }),
      ),
    );
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
        reason: "You have already cast one of these votes.",
      };
    }
    throw e;
  }
}

/** @deprecated Use {@link recordPublicVotes}. */
export async function recordPublicVote(
  entry: VehicleEntryRecord,
  fingerprint: string,
  votingCategoryId: string,
  userId: string | null,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  return recordPublicVotes(entry, fingerprint, [votingCategoryId], userId);
}

/** @deprecated Use getVisitorPublicVoteContext */
export async function hasExistingVisitorVote(
  entry: VehicleEntryRecord,
): Promise<boolean> {
  const fp = await readVoterFingerprint();
  if (!fp) return false;
  const ctx = await getVisitorPublicVoteContext(entry, fp);
  return ctx.votedCategoryIdsOnVehicle.length > 0;
}

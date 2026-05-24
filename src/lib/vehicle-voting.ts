import type { EventStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { createHash, randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { isPublicVotingOpenForEvent } from "@/lib/vehicle-entry-access";
import type { VehicleEntryRecord } from "@/lib/vehicle-entry-types";

export const VOTE_FINGERPRINT_COOKIE = "css_vote_fp";

export function entryAllowsPublicVoting(
  entry: VehicleEntryRecord,
  eventStatus: EventStatus,
): boolean {
  if (entry.votingStatus === "CLOSED") return false;
  return isPublicVotingOpenForEvent(eventStatus);
}

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

export function buildVoterKey(
  fingerprint: string,
  eventId: string,
  vehicleEntryCode: string,
): string {
  return createHash("sha256")
    .update(`${fingerprint}:${eventId}:${vehicleEntryCode}`)
    .digest("hex");
}

export async function hasVisitorVoted(
  entry: VehicleEntryRecord,
  voterKey: string,
): Promise<boolean> {
  const hit = await prisma.vehiclePublicVote.findUnique({
    where: {
      eventId_vehicleEntryCode_voterKey: {
        eventId: entry.eventId,
        vehicleEntryCode: entry.vehicleEntryCode,
        voterKey,
      },
    },
    select: { id: true },
  });
  return !!hit;
}

export async function recordPublicVote(
  entry: VehicleEntryRecord,
  voterKey: string,
  userId: string | null,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!entryAllowsPublicVoting(entry, entry.event.status)) {
    return { ok: false, reason: "Voting is not open for this vehicle." };
  }

  try {
    await prisma.vehiclePublicVote.create({
      data: {
        eventId: entry.eventId,
        vehicleEntryCode: entry.vehicleEntryCode,
        registrationId: entry.registrationId,
        registrationVehicleId: entry.registrationVehicleId,
        voterKey,
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
      return { ok: false, reason: "You have already voted for this vehicle." };
    }
    throw e;
  }
}

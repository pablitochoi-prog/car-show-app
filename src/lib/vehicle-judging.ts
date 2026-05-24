import { prisma } from "@/lib/db";
import { isJudgingOpenForEvent } from "@/lib/vehicle-entry-access";
import type { VehicleEntryRecord } from "@/lib/vehicle-entry-types";

export function entryAllowsJudging(
  entry: VehicleEntryRecord,
  eventStatus: Parameters<typeof isJudgingOpenForEvent>[0],
): boolean {
  if (entry.judgingStatus === "CLOSED") return false;
  return isJudgingOpenForEvent(eventStatus);
}

export async function getJudgeScoreForEntry(
  eventId: string,
  vehicleEntryCode: string,
  judgeUserId: string,
) {
  return prisma.vehicleJudgeScore.findUnique({
    where: {
      eventId_vehicleEntryCode_judgeUserId: {
        eventId,
        vehicleEntryCode,
        judgeUserId,
      },
    },
  });
}

export async function upsertJudgeScore(
  entry: VehicleEntryRecord,
  judgeUserId: string,
  score: number,
  notes: string | null,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!entryAllowsJudging(entry, entry.event.status)) {
    return { ok: false, reason: "Judging is not open for this vehicle." };
  }
  if (!Number.isInteger(score) || score < 1 || score > 100) {
    return { ok: false, reason: "Score must be an integer from 1 to 100." };
  }

  await prisma.vehicleJudgeScore.upsert({
    where: {
      eventId_vehicleEntryCode_judgeUserId: {
        eventId: entry.eventId,
        vehicleEntryCode: entry.vehicleEntryCode,
        judgeUserId,
      },
    },
    create: {
      eventId: entry.eventId,
      vehicleEntryCode: entry.vehicleEntryCode,
      registrationId: entry.registrationId,
      registrationVehicleId: entry.registrationVehicleId,
      judgeUserId,
      score,
      notes,
    },
    update: { score, notes },
  });

  return { ok: true };
}

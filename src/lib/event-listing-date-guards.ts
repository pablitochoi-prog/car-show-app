import type { PrismaClient } from "@prisma/client";
import {
  validateEventScheduleDatesNotInPast,
  validateSmsVotingWindowNotInPast,
  validateTierWindowNotInPast,
} from "@/lib/event-date-validation";

type DailyHourRow = { date?: string | null };

function asDailyHours(raw: unknown): DailyHourRow[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.filter((row) => row != null && typeof row === "object") as DailyHourRow[];
}

/** Block publish/schedule when stored event dates are still in the past. */
export async function validateEventListingDates(
  prisma: PrismaClient,
  eventId: string,
  input: {
    dailyHours?: unknown;
    rainDate?: string | null;
  },
): Promise<string | null> {
  const scheduleError = validateEventScheduleDatesNotInPast({
    dailyHours: asDailyHours(input.dailyHours),
    rainDate: input.rainDate,
  });
  if (scheduleError) return scheduleError;

  const tiers = await prisma.registrationTier.findMany({
    where: { eventId },
    select: { opensAt: true, closesAt: true },
  });
  for (const tier of tiers) {
    const tierError = validateTierWindowNotInPast(tier);
    if (tierError) return tierError;
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      smsVotingEnabled: true,
      smsVotingStartsAt: true,
      smsVotingEndsAt: true,
    },
  });
  if (!event) return null;

  return validateSmsVotingWindowNotInPast(event);
}

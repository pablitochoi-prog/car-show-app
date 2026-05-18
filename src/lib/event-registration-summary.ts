import type { RegistrationFeeType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getPlatformFee } from "@/lib/platform-fee";
import { computeRegistrationMoneyDisplay } from "@/lib/registration-row-money";

export type EventRegistrationSummary = {
  registrationCount: number;
  totalCars: number;
  /** Club registration fees / donations (excludes convenience fees). */
  totalRegistrationFeesCents: number;
  /** Club revenue collected (paid registrations). */
  totalCollectedCents: number;
  /** Unpaid club portion still due. */
  totalAmountDueCents: number;
  registrationFeeType: RegistrationFeeType;
};

const emptySummary = (
  registrationFeeType: RegistrationFeeType,
): EventRegistrationSummary => ({
  registrationCount: 0,
  totalCars: 0,
  totalRegistrationFeesCents: 0,
  totalCollectedCents: 0,
  totalAmountDueCents: 0,
  registrationFeeType,
});

/** Aggregate registration stats per event (non-cancelled registrations only). */
export async function loadEventRegistrationSummaries(
  eventIds: string[],
): Promise<Record<string, EventRegistrationSummary>> {
  if (eventIds.length === 0) return {};

  const uniqueIds = [...new Set(eventIds)];

  const [events, registrations, platformFee] = await Promise.all([
    prisma.event.findMany({
      where: { id: { in: uniqueIds } },
      select: {
        id: true,
        registrationFeeType: true,
        registrationFeeDollars: true,
      },
    }),
    prisma.registration.findMany({
      where: {
        eventId: { in: uniqueIds },
        status: { not: "CANCELLED" },
      },
      select: {
        eventId: true,
        status: true,
        paymentStatus: true,
        amountCents: true,
        platformFeeCents: true,
        refundedCents: true,
        guestVehicles: true,
        tier: { select: { priceCents: true } },
        vehicles: { select: { id: true } },
      },
    }),
    getPlatformFee(),
  ]);

  const eventMeta = new Map(
    events.map((e) => [
      e.id,
      {
        registrationFeeType: e.registrationFeeType ?? ("FREE" as const),
        suggestedDonationPerVehicleDollars: e.registrationFeeDollars,
      },
    ]),
  );

  const out: Record<string, EventRegistrationSummary> = {};
  for (const id of uniqueIds) {
    const meta = eventMeta.get(id);
    out[id] = emptySummary(meta?.registrationFeeType ?? "FREE");
  }

  for (const reg of registrations) {
    const meta = eventMeta.get(reg.eventId);
    if (!meta) continue;

    const money = computeRegistrationMoneyDisplay(
      reg,
      {
        registrationFeeType: meta.registrationFeeType,
        suggestedDonationPerVehicleDollars:
          meta.suggestedDonationPerVehicleDollars,
      },
      platformFee,
    );

    const summary = out[reg.eventId];
    summary.registrationCount += 1;
    summary.totalCars += money.vehicleCount;
    summary.totalRegistrationFeesCents += money.clubFeeCents;
    summary.totalCollectedCents += money.clubCollectedCents;
    summary.totalAmountDueCents += money.clubDueCents;
  }

  return out;
}

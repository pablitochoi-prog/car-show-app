import { prisma } from "@/lib/db";
import { getDonationAmountCentsFromPaidRegistration } from "@/lib/donation";
import { getPlatformFee } from "@/lib/platform-fee";
import { calculateApplicationFee } from "@/lib/platform-fee-config";
import {
  getRegistrationAmounts,
  getRegistrationDisplayStatus,
} from "@/lib/registration-payment-display";
import { resolvePayableTier } from "@/lib/tiers";

export type RegisteredEventStatus = {
  registrationId: string;
  label: string;
  complete: boolean;
};

/** Map of eventId -> registrationId for the user's active (non-cancelled) registrations. */
export async function getRegisteredEventMapForUser(
  userId: string,
): Promise<Map<string, string>> {
  const statusMap = await getRegisteredEventStatusMapForUser(userId);
  return new Map(
    [...statusMap.entries()].map(([eventId, status]) => [
      eventId,
      status.registrationId,
    ]),
  );
}

/** Registration status per event for browse/search views. */
export async function getRegisteredEventStatusMapForUser(
  userId: string,
): Promise<Map<string, RegisteredEventStatus>> {
  const platformFee = await getPlatformFee();

  const registrations = await prisma.registration.findMany({
    where: {
      userId,
      status: { not: "CANCELLED" },
    },
    select: {
      id: true,
      eventId: true,
      status: true,
      paymentStatus: true,
      amountCents: true,
      platformFeeCents: true,
      tierId: true,
      tier: { select: { priceCents: true } },
      vehicles: { select: { id: true } },
      event: {
        select: {
          id: true,
          registrationFeeType: true,
          registrationFeeDollars: true,
        },
      },
    },
  });

  const eventIds = [...new Set(registrations.map((r) => r.event.id))];
  const tierRows =
    eventIds.length > 0
      ? await prisma.registrationTier.findMany({
          where: { eventId: { in: eventIds } },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        })
      : [];
  const tiersByEvent = new Map<string, typeof tierRows>();
  for (const tier of tierRows) {
    const list = tiersByEvent.get(tier.eventId) ?? [];
    list.push(tier);
    tiersByEvent.set(tier.eventId, list);
  }

  const result = new Map<string, RegisteredEventStatus>();

  for (const registration of registrations) {
    const eventTiers = tiersByEvent.get(registration.event.id) ?? [];
    const payable = resolvePayableTier(eventTiers, registration.tierId);
    const pricingTier = payable?.tier ?? registration.tier;
    const vehicleCount = Math.max(registration.vehicles.length, 1);

    const tierPriceCents =
      registration.event.registrationFeeType === "DONATION"
        ? registration.paymentStatus === "PAID" &&
          (registration.amountCents ?? 0) > 0
          ? getDonationAmountCentsFromPaidRegistration({
              amountPaidCents: registration.amountCents!,
              platformFeeCentsPaid: registration.platformFeeCents,
              vehicleCount,
              perVehiclePlatformFeeFn: (unit) =>
                calculateApplicationFee(platformFee, unit),
              suggestedDonationPerVehicleDollars:
                registration.event.registrationFeeDollars,
            })
          : (registration.amountCents ?? 0)
        : pricingTier.priceCents;

    const amounts = getRegistrationAmounts({
      registrationFeeType: registration.event.registrationFeeType,
      unitPriceCents: tierPriceCents,
      vehicleCount,
      registrationStatus: registration.status,
      paymentStatus: registration.paymentStatus,
      amountCents: registration.amountCents,
      platformFeeCents: registration.platformFeeCents,
      platformFee,
      suggestedDonationPerVehicleDollars:
        registration.event.registrationFeeDollars,
    });

    const display = getRegistrationDisplayStatus({
      registrationStatus: registration.status,
      paymentStatus: registration.paymentStatus,
      amountDueCents: amounts.amountDueCents,
    });

    const complete = display.variant === "success";

    result.set(registration.eventId, {
      registrationId: registration.id,
      label: complete ? "Registered" : display.label,
      complete,
    });
  }

  return result;
}

/** Event IDs where the user has an active (non-cancelled) exhibitor registration. */
export async function getRegisteredEventIdsForUser(
  userId: string,
): Promise<Set<string>> {
  const map = await getRegisteredEventMapForUser(userId);
  return new Set(map.keys());
}

export function isEventRegistered(
  eventId: string,
  registeredEventIds: Set<string> | Map<string, string>,
): boolean {
  return registeredEventIds.has(eventId);
}

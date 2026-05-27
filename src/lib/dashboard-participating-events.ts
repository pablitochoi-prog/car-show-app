import { prisma } from "@/lib/db";
import { getDonationAmountCentsFromPaidRegistration } from "@/lib/donation";
import { getPlatformFee } from "@/lib/platform-fee";
import { calculateApplicationFee } from "@/lib/platform-fee-config";
import { formatMoney } from "@/components/registration/reg-utils";
import {
  getRegistrationAmounts,
  getRegistrationPaymentDisplay,
} from "@/lib/registration-payment-display";
import { resolvePayableTier } from "@/lib/tiers";
import { eventBrandingFromEvent } from "@/lib/event-card-branding";
import type { ParticipatingEventRow } from "@/components/dashboard/events/event-rows";

export const PARTICIPATING_PAST_DAYS = 7;

/** Start of day, seven days before today — events before this are hidden by default. */
export function participatingEventsCutoffDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - PARTICIPATING_PAST_DAYS);
  return d;
}

function registrationWhere(userId: string, showPast: boolean) {
  return {
    userId,
    ...(showPast
      ? {}
      : {
          event: {
            startDate: { gte: participatingEventsCutoffDate() },
          },
        }),
  };
}

export async function countParticipatingRegistrations(
  userId: string,
  showPast: boolean,
): Promise<number> {
  return prisma.registration.count({
    where: registrationWhere(userId, showPast),
  });
}

export async function loadParticipatingEventRowsPage(
  userId: string,
  showPast: boolean,
  skip: number,
  take: number,
): Promise<ParticipatingEventRow[]> {
  const platformFee = await getPlatformFee();

  const registrations = await prisma.registration.findMany({
    where: registrationWhere(userId, showPast),
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      amountCents: true,
      platformFeeCents: true,
      event: {
        select: {
          id: true,
          name: true,
          showNumber: true,
          logoUrl: true,
          startDate: true,
          city: true,
          state: true,
          status: true,
          registrationFeeType: true,
          registrationFeeDollars: true,
          organization: { select: { name: true, logo: true } },
        },
      },
      tierId: true,
      tier: { select: { name: true, priceCents: true } },
      vehicles: { select: { id: true } },
    },
    orderBy: { event: { startDate: "asc" } },
    skip,
    take,
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
  for (const t of tierRows) {
    const list = tiersByEvent.get(t.eventId) ?? [];
    list.push(t);
    tiersByEvent.set(t.eventId, list);
  }

  return registrations.map((r) => {
    const eventTiers = tiersByEvent.get(r.event.id) ?? [];
    const payable = resolvePayableTier(eventTiers, r.tierId);
    const pricingTier = payable?.tier ?? r.tier;

    const vehicleCount = Math.max(r.vehicles.length, 1);
    const tierPriceCents =
      r.event.registrationFeeType === "DONATION"
        ? r.paymentStatus === "PAID" && (r.amountCents ?? 0) > 0
          ? getDonationAmountCentsFromPaidRegistration({
              amountPaidCents: r.amountCents!,
              platformFeeCentsPaid: r.platformFeeCents,
              vehicleCount,
              perVehiclePlatformFeeFn: (unit) =>
                calculateApplicationFee(platformFee, unit),
              suggestedDonationPerVehicleDollars:
                r.event.registrationFeeDollars,
            })
          : (r.amountCents ?? 0)
        : pricingTier.priceCents;

    const amounts = getRegistrationAmounts({
      registrationFeeType: r.event.registrationFeeType,
      unitPriceCents: tierPriceCents,
      vehicleCount,
      registrationStatus: r.status,
      paymentStatus: r.paymentStatus,
      amountCents: r.amountCents,
      platformFeeCents: r.platformFeeCents,
      platformFee,
      suggestedDonationPerVehicleDollars: r.event.registrationFeeDollars,
    });

    const payment = getRegistrationPaymentDisplay({
      tierPriceCents,
      vehicleCount,
      registrationStatus: r.status,
      paymentStatus: r.paymentStatus,
      amountCents: r.amountCents,
      platformFee,
    });

    const paymentLabel =
      amounts.amountDueCents > 0
        ? `Amount due: ${formatMoney(amounts.amountDueCents)}`
        : payment?.label ?? null;
    const paymentKind =
      amounts.amountDueCents > 0 ? ("due" as const) : (payment?.kind ?? null);

    return {
      registrationId: r.id,
      eventId: r.event.id,
      name: r.event.name,
      showNumber: r.event.showNumber,
      startDate: r.event.startDate,
      city: r.event.city,
      state: r.event.state,
      eventStatus: r.event.status,
      registrationStatus: r.status,
      tierName: pricingTier.name,
      vehicleCount: r.vehicles.length,
      paymentLabel,
      paymentKind,
      ...eventBrandingFromEvent(r.event),
    };
  });
}

import type { RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { eventBrandingFromEvent } from "@/lib/event-card-branding";
import { getPlatformFee } from "@/lib/platform-fee";
import { getDonationAmountCentsFromPaidRegistration } from "@/lib/donation";
import {
  formatRegistrationAmounts,
  getRegistrationAmounts,
  getRegistrationDisplayStatus,
} from "@/lib/registration-payment-display";
import { calculateApplicationFee } from "@/lib/platform-fee-config";
import { resolvePayableTier } from "@/lib/tiers";
import {
  buildAddToCalendarLinks,
  type AddToCalendarLinks,
} from "@/lib/event-calendar";

export type MyRegistrationVehicle = {
  id: string;
  label: string;
  /** Event show / SMS id when assigned (e.g. AXY-004). */
  publicVehicleId: string | null;
};

export type MyRegistrationCard = {
  id: string;
  eventId: string;
  eventName: string;
  showNumber: number;
  logoUrl: string | null;
  orgName: string | null;
  orgLogoUrl: string | null;
  startDate: Date;
  startTime: string | null;
  endTime: string | null;
  city: string | null;
  state: string | null;
  tierName: string;
  registrationStatus: RegistrationStatus;
  statusLabel: string;
  statusVariant: "success" | "warning" | "danger" | "muted";
  amountPaid: string;
  amountDue: string;
  hasAmountDue: boolean;
  vehicles: MyRegistrationVehicle[];
  calendarLinks: AddToCalendarLinks;
};

export async function loadMyRegistrationCards(
  userId: string,
): Promise<MyRegistrationCard[]> {
  const platformFee = await getPlatformFee();

  const rows = await prisma.registration.findMany({
    where: { userId },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      amountCents: true,
      platformFeeCents: true,
      tierId: true,
      event: {
        select: {
          id: true,
          name: true,
          showNumber: true,
          logoUrl: true,
          description: true,
          venue: true,
          street: true,
          city: true,
          state: true,
          zip: true,
          startDate: true,
          endDate: true,
          startTime: true,
          endTime: true,
          dailyHours: true,
          eventWebsite: true,
          registrationFeeType: true,
          registrationFeeDollars: true,
          organization: { select: { name: true, logo: true } },
        },
      },
      tier: { select: { name: true, priceCents: true } },
      vehicles: {
        select: {
          id: true,
          publicVehicleId: true,
          vehicle: {
            select: { id: true, year: true, make: true, model: true, trim: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const eventIds = [...new Set(rows.map((r) => r.event.id))];
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

  return rows.map((r) => {
    const eventTiers = tiersByEvent.get(r.event.id) ?? [];
    const payable = resolvePayableTier(eventTiers, r.tierId);
    const pricingTier = payable?.tier ?? r.tier;
    const vehicleCount = r.vehicles.length;

    const unitPriceCents =
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
      unitPriceCents,
      vehicleCount,
      registrationStatus: r.status,
      paymentStatus: r.paymentStatus,
      amountCents: r.amountCents,
      platformFeeCents: r.platformFeeCents,
      platformFee,
      suggestedDonationPerVehicleDollars: r.event.registrationFeeDollars,
    });

    const display = getRegistrationDisplayStatus({
      registrationStatus: r.status,
      paymentStatus: r.paymentStatus,
      amountDueCents: amounts.amountDueCents,
    });

    const { amountPaid, amountDue } = formatRegistrationAmounts(amounts);

    const branding = eventBrandingFromEvent(r.event);

    const calendarLinks = buildAddToCalendarLinks({
      eventId: r.event.id,
      name: r.event.name,
      showNumber: r.event.showNumber,
      description: r.event.description,
      venue: r.event.venue,
      street: r.event.street,
      city: r.event.city,
      state: r.event.state,
      zip: r.event.zip,
      startDate: r.event.startDate,
      endDate: r.event.endDate,
      startTime: r.event.startTime,
      endTime: r.event.endTime,
      dailyHours: r.event.dailyHours,
      eventWebsite: r.event.eventWebsite,
    });

    return {
      id: r.id,
      eventId: r.event.id,
      eventName: r.event.name,
      showNumber: r.event.showNumber,
      ...branding,
      startDate: r.event.startDate,
      startTime: r.event.startTime,
      endTime: r.event.endTime,
      city: r.event.city,
      state: r.event.state,
      tierName: pricingTier.name,
      registrationStatus: r.status,
      statusLabel: display.label,
      statusVariant: display.variant,
      amountPaid,
      amountDue,
      hasAmountDue: amounts.amountDueCents > 0,
      vehicles: r.vehicles.map((rv) => ({
        id: rv.vehicle.id,
        publicVehicleId: rv.publicVehicleId ?? null,
        label: `${rv.vehicle.year} ${rv.vehicle.make} ${rv.vehicle.model}${
          rv.vehicle.trim ? ` ${rv.vehicle.trim}` : ""
        }`,
      })),
      calendarLinks,
    };
  });
}

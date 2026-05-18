import { prisma } from "@/lib/db";
import type { RegistrationFeeType } from "@prisma/client";

export const GENERAL_ADMISSION_TIER_NAME = "General Admission";

export type SimpleRegistrationFeeType = "FREE" | "PAID" | "DONATION";

export function usesGeneralAdmissionTier(
  feeType: RegistrationFeeType | string | null | undefined,
): feeType is SimpleRegistrationFeeType {
  return (
    feeType === "FREE" || feeType === "PAID" || feeType === "DONATION"
  );
}

export function isTieredRegistrationFees(
  feeType: RegistrationFeeType | string | null | undefined,
): boolean {
  return feeType === "PAID_TIERED";
}

export function generalAdmissionPriceCents(
  feeType: SimpleRegistrationFeeType,
  registrationFeeDollars: number | null,
): number {
  if (feeType === "PAID" && registrationFeeDollars != null) {
    return registrationFeeDollars * 100;
  }
  return 0;
}

/**
 * Ensures a single hidden General Admission tier exists for free, flat paid,
 * and donation events. Removes extra tiers only when they have no registrations.
 */
export async function syncGeneralAdmissionTier(
  eventId: string,
  feeType: RegistrationFeeType | string | null,
  registrationFeeDollars: number | null,
): Promise<void> {
  if (!usesGeneralAdmissionTier(feeType)) return;

  const priceCents = generalAdmissionPriceCents(feeType, registrationFeeDollars);

  const tiers = await prisma.registrationTier.findMany({
    where: { eventId },
    include: { _count: { select: { registrations: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  let ga = tiers.find((t) => t.name === GENERAL_ADMISSION_TIER_NAME);

  if (ga) {
    await prisma.registrationTier.update({
      where: { id: ga.id },
      data: {
        priceCents,
        sortOrder: 0,
        opensAt: null,
        closesAt: null,
        memberOnly: false,
      },
    });
  } else {
    ga = await prisma.registrationTier.create({
      data: {
        eventId,
        name: GENERAL_ADMISSION_TIER_NAME,
        priceCents,
        sortOrder: 0,
      },
      include: { _count: { select: { registrations: true } } },
    });
  }

  for (const tier of tiers) {
    if (tier.id === ga.id) continue;
    if (tier._count.registrations === 0) {
      await prisma.registrationTier.delete({ where: { id: tier.id } });
    }
  }
}

export const TIER_MANAGEMENT_FEE_TYPE_ERROR =
  "Registration tiers are only configurable for paid tiered events. Free, flat rate, and donation events use General Admission automatically.";

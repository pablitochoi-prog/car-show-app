import { prisma } from "@/lib/db";

export type FinancialMetricRow = {
  label: string;
  value: string;
  note?: string;
};

export type FinancialTierRow = {
  tierName: string;
  registrationCount: number;
  grossCents: number;
};

export type FinancialSummaryReport = {
  generatedAt: string;
  metrics: FinancialMetricRow[];
  revenueByTier: FinancialTierRow[];
};

function formatMoney(cents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export async function loadFinancialSummaryReport(
  eventId: string,
): Promise<FinancialSummaryReport> {
  const registrations = await prisma.registration.findMany({
    where: { eventId },
    select: {
      status: true,
      paymentStatus: true,
      amountCents: true,
      platformFeeCents: true,
      refundedCents: true,
      paidAt: true,
      tier: { select: { name: true, priceCents: true } },
      vehicles: { select: { id: true } },
      guestVehicles: true,
    },
  });

  let vehicleCount = 0;
  let paidCount = 0;
  let freeCount = 0;
  let pendingPaymentCount = 0;
  let refundedCount = 0;
  let cancelledCount = 0;
  let grossCents = 0;
  let platformFeeCents = 0;
  let refundedTotalCents = 0;

  const tierMap = new Map<string, { count: number; gross: number }>();

  for (const r of registrations) {
    const tierName = r.tier.name;
    const tierBucket = tierMap.get(tierName) ?? { count: 0, gross: 0 };
    tierBucket.count += 1;
    tierMap.set(tierName, tierBucket);

    vehicleCount += r.vehicles.length;
    if (Array.isArray(r.guestVehicles)) {
      vehicleCount += (r.guestVehicles as unknown[]).length;
    }

    if (r.status === "CANCELLED") cancelledCount += 1;
    if (r.paymentStatus === "REFUNDED" || (r.refundedCents ?? 0) > 0) {
      refundedCount += 1;
    }
    if (r.paymentStatus === "PENDING") pendingPaymentCount += 1;

    const paid =
      r.paymentStatus === "PAID" ||
      (r.amountCents != null && r.amountCents > 0 && r.paidAt != null);
    const isFree =
      (r.tier.priceCents ?? 0) === 0 &&
      (r.amountCents == null || r.amountCents === 0);

    if (paid) {
      paidCount += 1;
      const amt = r.amountCents ?? r.tier.priceCents ?? 0;
      grossCents += amt;
      tierBucket.gross += amt;
      platformFeeCents += r.platformFeeCents ?? 0;
    } else if (isFree) {
      freeCount += 1;
    }

    refundedTotalCents += r.refundedCents ?? 0;
  }

  const totalRegs = registrations.length;
  const netCents = grossCents - platformFeeCents - refundedTotalCents;
  const avgPerReg = paidCount > 0 ? Math.round(grossCents / paidCount) : 0;
  const avgPerVehicle =
    vehicleCount > 0 ? Math.round(grossCents / vehicleCount) : 0;

  const metrics: FinancialMetricRow[] = [
    { label: "Total registrations", value: String(totalRegs) },
    { label: "Total registered vehicles", value: String(vehicleCount) },
    { label: "Paid registrations", value: String(paidCount) },
    { label: "Free / comped registrations", value: String(freeCount) },
    { label: "Pending / unpaid payments", value: String(pendingPaymentCount) },
    { label: "Refunded registrations", value: String(refundedCount) },
    { label: "Cancelled registrations", value: String(cancelledCount) },
    { label: "Gross registration revenue", value: formatMoney(grossCents) },
    {
      label: "Platform fees (collected)",
      value: formatMoney(platformFeeCents),
    },
    {
      label: "Stripe / payment processing fees",
      value: "Not tracked yet",
      note: "Per-registration processor fees are not stored in the database.",
    },
    {
      label: "Refunds (cumulative)",
      value: formatMoney(refundedTotalCents),
    },
    {
      label: "Estimated organizer net",
      value: formatMoney(netCents),
      note: "Gross minus platform fees and refunds. Excludes Stripe processing fees.",
    },
    {
      label: "Average revenue per paid registration",
      value: paidCount > 0 ? formatMoney(avgPerReg) : "—",
    },
    {
      label: "Average revenue per vehicle",
      value: vehicleCount > 0 ? formatMoney(avgPerVehicle) : "—",
    },
    {
      label: "Revenue by registration date",
      value: "Not tracked yet",
      note: "Daily revenue breakdown can be added in a later phase.",
    },
  ];

  const revenueByTier = [...tierMap.entries()]
    .map(([tierName, data]) => ({
      tierName,
      registrationCount: data.count,
      grossCents: data.gross,
    }))
    .sort((a, b) => b.grossCents - a.grossCents);

  return {
    generatedAt: new Date().toISOString(),
    metrics,
    revenueByTier,
  };
}

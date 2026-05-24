import { dollarsToCents } from "@/lib/money";

/** Parse a dollar amount string into integer cents, or null if empty/invalid. */
export function parseDonationDollarsInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const dollars = Number(trimmed);
  if (!Number.isFinite(dollars) || dollars < 0) return null;
  return dollarsToCents(dollars);
}

/** Format cents as a dollar string for form inputs (e.g. "25.00"). */
export function formatDonationDollarsFromCents(cents: number | null | undefined): string {
  if (cents == null || cents <= 0) return "";
  return (cents / 100).toFixed(2);
}

/** Per-vehicle suggested donation from event setup (registrationFeeDollars). */
export function suggestedDonationPerVehicleDollars(
  registrationFeeDollars: number | null | undefined,
): number {
  if (registrationFeeDollars == null || registrationFeeDollars < 0) return 0;
  return registrationFeeDollars;
}

/** Total suggested donation = per-vehicle suggestion × vehicle count. */
export function suggestedDonationTotalDollars(
  registrationFeeDollars: number | null | undefined,
  vehicleCount: number,
): number {
  const perVehicle = suggestedDonationPerVehicleDollars(registrationFeeDollars);
  const count = Math.max(vehicleCount, 1);
  return perVehicle * count;
}

/** Suggested total as a form default string. */
export function suggestedDonationDollarsInput(
  registrationFeeDollars: number | null | undefined,
  vehicleCount = 1,
): string {
  const total = suggestedDonationTotalDollars(
    registrationFeeDollars,
    vehicleCount,
  );
  if (total <= 0) return "";
  return total.toFixed(2);
}

/**
 * Donation-only cents from `registration.amountCents`.
 * After checkout this field holds the full charge (donation + platform fees);
 * subtract stored platform fees when present.
 */
export function resolveDonationUnitCents(
  amountCents: number | null | undefined,
  platformFeeCents: number | null | undefined,
): number {
  if (amountCents == null || amountCents <= 0) return 0;
  if (
    platformFeeCents != null &&
    platformFeeCents > 0 &&
    amountCents > platformFeeCents
  ) {
    return amountCents - platformFeeCents;
  }
  return amountCents;
}

/**
 * Donation portion implied by a paid registration total.
 * Uses the greater of stored vs. expected platform fees so vehicle-count
 * changes after payment do not show a false balance due.
 */
export function getDonationAmountCentsFromPaidRegistration(input: {
  amountPaidCents: number;
  platformFeeCentsPaid: number | null | undefined;
  vehicleCount: number;
  perVehiclePlatformFeeFn: (suggestedUnitCents: number) => number;
  suggestedDonationPerVehicleDollars?: number | null;
}): number {
  const { totalCents: obligationPlatformFee } = donationPlatformFeeTotalCents(
    input.perVehiclePlatformFeeFn,
    input.suggestedDonationPerVehicleDollars,
    input.vehicleCount,
  );
  const storedPlatform = input.platformFeeCentsPaid ?? 0;
  const allocatedPlatform = Math.max(storedPlatform, obligationPlatformFee);
  return Math.max(0, input.amountPaidCents - allocatedPlatform);
}

/** Platform registration fee for donation events (per vehicle, based on suggested donation). */
export function donationPlatformFeeTotalCents(
  perVehicleFeeFn: (tierUnitCents: number) => number,
  suggestedPerVehicleDollars: number | null | undefined,
  vehicleCount: number,
): { perVehicleCents: number; totalCents: number } {
  const unitCents = dollarsToCents(
    suggestedDonationPerVehicleDollars(suggestedPerVehicleDollars),
  );
  const perVehicleCents = perVehicleFeeFn(unitCents);
  const count = Math.max(vehicleCount, 1);
  return { perVehicleCents, totalCents: perVehicleCents * count };
}

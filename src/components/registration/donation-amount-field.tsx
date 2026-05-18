"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { suggestedDonationPerVehicleDollars } from "@/lib/donation";

type DonationAmountFieldProps = {
  value: string;
  onChange: (value: string) => void;
  /** Event suggested donation per vehicle (registrationFeeDollars). */
  suggestedPerVehicleDollars: number | null;
  vehicleCount: number;
  disabled?: boolean;
  id?: string;
};

export function DonationAmountField({
  value,
  onChange,
  suggestedPerVehicleDollars,
  vehicleCount,
  disabled,
  id = "donation-amount",
}: DonationAmountFieldProps) {
  const perVehicle = suggestedDonationPerVehicleDollars(
    suggestedPerVehicleDollars,
  );
  const placeholderTotal =
    perVehicle > 0
      ? (perVehicle * Math.max(vehicleCount, 1)).toFixed(2)
      : "0.00";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={id} className="shrink-0 text-sm font-medium">
          Donation amount
        </Label>
        <div className="relative w-full max-w-[9.5rem] shrink-0">
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          >
            $
          </span>
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            min={0}
            step={0.01}
            placeholder={placeholderTotal}
            className="pl-7 text-right"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </div>
      {perVehicle > 0 && (
        <p className="text-sm text-muted-foreground">
          Suggested Donation: ${perVehicle.toFixed(2)} per vehicle. Enter any
          amount you wish to pay.
        </p>
      )}
    </div>
  );
}

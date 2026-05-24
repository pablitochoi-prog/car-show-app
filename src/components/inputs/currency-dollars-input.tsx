"use client";

import { Input } from "@/components/ui/input";
import { roundDollars } from "@/lib/money";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
};

/** Dollar amount with optional cents (e.g. $26.50); fixed $ prefix. */
export function CurrencyDollarsInput({
  id,
  value,
  onChange,
  disabled,
  className,
  "aria-invalid": ariaInvalid,
}: Props) {
  return (
    <div
      className={cn(
        "relative flex h-10 w-full min-w-0 items-center rounded-md border border-input bg-transparent shadow-xs sm:h-11",
        disabled && "opacity-60",
        className
      )}
    >
      <span
        className="pointer-events-none absolute left-3 text-sm text-muted-foreground select-none"
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
        autoComplete="off"
        disabled={disabled}
        aria-invalid={ariaInvalid}
        className="h-full min-h-0 border-0 bg-transparent pl-8 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        placeholder="0.00"
        value={value === null || value === undefined ? "" : value}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw.trim() === "") {
            onChange(null);
            return;
          }
          const dollars = Number(raw);
          if (!Number.isFinite(dollars) || dollars < 0) return;
          onChange(roundDollars(dollars));
        }}
      />
    </div>
  );
}

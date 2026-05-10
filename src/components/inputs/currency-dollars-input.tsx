"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
};

/** Whole-dollar amount; fixed $ prefix; integers only. */
export function CurrencyDollarsInput({
  id,
  value,
  onChange,
  disabled,
  className,
  "aria-invalid": ariaInvalid,
}: Props) {
  const display = value === null || value === undefined ? "" : String(value);

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
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        aria-invalid={ariaInvalid}
        className="h-full min-h-0 border-0 bg-transparent pl-8 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        placeholder=""
        value={display}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          if (digits === "") {
            onChange(null);
            return;
          }
          const n = parseInt(digits, 10);
          if (!Number.isFinite(n) || n < 0) return;
          onChange(n);
        }}
      />
    </div>
  );
}

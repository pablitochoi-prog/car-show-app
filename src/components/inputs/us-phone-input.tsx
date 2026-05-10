"use client";

import { Input } from "@/components/ui/input";
import { digitsFromPhoneInput, formatUSPhoneDigits } from "@/lib/phone-us";

type UsPhoneInputProps = {
  id: string;
  value: string;
  onChange: (masked: string) => void;
  disabled?: boolean;
  className?: string;
};

export function UsPhoneInput({
  id,
  value,
  onChange,
  disabled,
  className,
}: UsPhoneInputProps) {
  return (
    <Input
      id={id}
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      placeholder="(555) 555-5555"
      value={value}
      disabled={disabled}
      className={className}
      onChange={(e) => {
        const digits = digitsFromPhoneInput(e.target.value);
        onChange(formatUSPhoneDigits(digits));
      }}
    />
  );
}

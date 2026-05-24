"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type EventCategoryOption = { id: string; name: string };

export function VehicleClassSelect({
  value,
  onChange,
  categories,
  className,
  invalid = false,
  id,
}: {
  value: string | null | undefined;
  onChange: (eventCategoryId: string) => void;
  categories: EventCategoryOption[];
  className?: string;
  invalid?: boolean;
  id?: string;
}) {
  const items = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  // Always pass a defined value so the Select stays controlled (never undefined).
  const selectedValue = value ?? "";

  return (
    <Select
      value={selectedValue}
      items={items}
      onValueChange={(val) => {
        if (val) onChange(val);
      }}
    >
      <SelectTrigger
        id={id}
        className={cn(
          "h-8 w-full min-w-[140px] text-xs",
          invalid && "border-destructive aria-invalid:border-destructive",
          className,
        )}
        aria-required
        aria-invalid={invalid || undefined}
      >
        <SelectValue placeholder="Select class">
          {(selected) => {
            if (!selected) return null;
            return items[selected as string] ?? null;
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {categories.map((cat) => (
          <SelectItem key={cat.id} value={cat.id} label={cat.name}>
            {cat.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

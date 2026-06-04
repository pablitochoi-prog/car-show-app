"use client";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SpecialJudgeStaffOption } from "@/hooks/use-event-setup-cache";

type SpecialJudgeMultiSelectProps = {
  staff: SpecialJudgeStaffOption[];
  selectedUserIds: string[];
  onSelectedUserIdsChange: (ids: string[]) => void;
  disabled?: boolean;
};

export function SpecialJudgeMultiSelect({
  staff,
  selectedUserIds,
  onSelectedUserIdsChange,
  disabled,
}: SpecialJudgeMultiSelectProps) {
  const sorted = [...staff].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );

  const selectedPeople = sorted.filter((s) =>
    selectedUserIds.includes(s.userId),
  );

  const triggerLabel =
    selectedPeople.length === 0
      ? "Select Special Judges"
      : selectedPeople.map((s) => s.name).join(", ");

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-7 max-w-[min(14rem,42vw)] justify-between gap-1 px-2 py-0 text-[11px] font-normal",
        )}
        title={triggerLabel}
      >
        <span className="truncate text-left">{triggerLabel}</span>
        <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[min(100vw-2rem,18rem)] max-h-[min(50vh,16rem)] overflow-y-auto"
        align="end"
      >
        {sorted.map((person) => (
          <DropdownMenuCheckboxItem
            key={person.userId}
            checked={selectedUserIds.includes(person.userId)}
            disabled={disabled}
            onCheckedChange={(checked) => {
              if (checked) {
                if (!selectedUserIds.includes(person.userId)) {
                  onSelectedUserIdsChange([...selectedUserIds, person.userId]);
                }
              } else {
                onSelectedUserIdsChange(
                  selectedUserIds.filter((id) => id !== person.userId),
                );
              }
            }}
          >
            <span className="font-medium">{person.name}</span>
            <span className="ml-1 text-muted-foreground">({person.email})</span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

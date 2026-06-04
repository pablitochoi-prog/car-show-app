"use client";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type JudgeStaffOption = {
  userId: string;
  name: string;
  email: string;
};

type JudgeStaffMultiSelectProps = {
  judges: JudgeStaffOption[];
  selectedUserIds: string[];
  onSelectedUserIdsChange: (ids: string[]) => void;
  disabled?: boolean;
  label?: string;
  emptyMessage?: string;
};

export function JudgeStaffMultiSelect({
  judges,
  selectedUserIds,
  onSelectedUserIdsChange,
  disabled,
  label = "Event judges",
  emptyMessage = "Assign judges on the event staff page first.",
}: JudgeStaffMultiSelectProps) {
  const sorted = [...judges].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );

  if (sorted.length === 0) {
    return (
      <div className="space-y-2">
        {label ? <Label>{label}</Label> : null}
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  const selectedPeople = sorted.filter((j) => selectedUserIds.includes(j.userId));
  const allSelected = selectedPeople.length === sorted.length;

  const triggerLabel =
    selectedPeople.length === 0
      ? "Select judges"
      : allSelected
        ? "All judges selected"
        : selectedPeople.map((j) => j.name).join(", ");

  return (
    <div className="flex h-full flex-col space-y-2">
      {label ? <Label>{label}</Label> : null}
      <p className="text-xs text-muted-foreground">
        Choose who may vote in this category. All judges are selected by default.
      </p>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          disabled={disabled}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-9 w-full justify-between gap-2 px-3 text-sm font-normal",
          )}
          title={triggerLabel}
        >
          <span className="truncate text-left">{triggerLabel}</span>
          <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[var(--anchor-width)] max-h-[min(50vh,16rem)] overflow-y-auto"
          align="start"
        >
          {sorted.map((person) => (
            <DropdownMenuCheckboxItem
              key={person.userId}
              checked={selectedUserIds.includes(person.userId)}
              disabled={disabled}
              onCheckedChange={(checked) => {
                if (checked) {
                  if (!selectedUserIds.includes(person.userId)) {
                    onSelectedUserIdsChange([
                      ...selectedUserIds,
                      person.userId,
                    ]);
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
    </div>
  );
}

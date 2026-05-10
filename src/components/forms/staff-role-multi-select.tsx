"use client";

import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { sortStaffRoleBadgesForDisplay } from "@/lib/event-role-labels";

export type RoleDefinitionOption = {
  id: string;
  name: string;
  slug: string | null;
  isDefault: boolean;
  sortOrder: number;
};

type StaffRoleMultiSelectProps = {
  eventId: string;
  roleDefinitions: RoleDefinitionOption[];
  selectedRoleIds: string[];
  onSelectedRoleIdsChange: (ids: string[]) => void;
  onRoleDefinitionsChange: (roles: RoleDefinitionOption[]) => void;
  disabled?: boolean;
  labelledBy?: string;
};

export function StaffRoleMultiSelect({
  eventId,
  roleDefinitions,
  selectedRoleIds,
  onSelectedRoleIdsChange,
  onRoleDefinitionsChange,
  disabled,
  labelledBy,
}: StaffRoleMultiSelectProps) {
  const [customName, setCustomName] = useState("");
  const [customBusy, setCustomBusy] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  async function submitCustomRole() {
    const trimmed = customName.trim();
    if (!trimmed) {
      setCustomError("Role name is required.");
      return;
    }

    setCustomBusy(true);
    setCustomError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/staff/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name: trimmed }),
      });
      const data = (await res.json()) as {
        role?: RoleDefinitionOption;
        roles?: RoleDefinitionOption[];
        error?: string | Record<string, string[]>;
      };

      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Could not create role.";
        setCustomError(msg);
        return;
      }

      if (data.roles) {
        onRoleDefinitionsChange(data.roles);
      }
      if (data.role) {
        onSelectedRoleIdsChange([...selectedRoleIds, data.role.id]);
      }
      setCustomName("");
    } catch {
      setCustomError("Network error. Try again.");
    } finally {
      setCustomBusy(false);
    }
  }

  const sortedDefs = [...roleDefinitions].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );

  const selectedForBadges = selectedRoleIds
    .map((id) => roleDefinitions.find((r) => r.id === id))
    .filter((r): r is RoleDefinitionOption => Boolean(r));

  const orderedLabels = sortStaffRoleBadgesForDisplay(
    selectedForBadges.map((r) => ({ slug: r.slug, name: r.name })),
  );

  const triggerLabel =
    selectedRoleIds.length === 0
      ? "Select roles"
      : `${selectedRoleIds.length} role${selectedRoleIds.length === 1 ? "" : "s"} selected`;

  return (
    <div className="space-y-2">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          disabled={disabled}
          aria-labelledby={labelledBy}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-auto min-h-9 w-full justify-between gap-2 py-1.5 font-normal",
          )}
        >
          <span className="truncate text-left">{triggerLabel}</span>
          <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[min(100vw-2rem,20rem)] max-h-[min(70vh,24rem)] overflow-y-auto"
          align="start"
        >
          {sortedDefs.map((role) => (
            <DropdownMenuCheckboxItem
              key={role.id}
              checked={selectedRoleIds.includes(role.id)}
              disabled={
                disabled ||
                (selectedRoleIds.includes(role.id) &&
                  selectedRoleIds.length <= 1)
              }
              onCheckedChange={(checked) => {
                if (checked) {
                  if (!selectedRoleIds.includes(role.id)) {
                    onSelectedRoleIdsChange([...selectedRoleIds, role.id]);
                  }
                } else if (selectedRoleIds.length > 1) {
                  onSelectedRoleIdsChange(
                    selectedRoleIds.filter((id) => id !== role.id),
                  );
                }
              }}
            >
              {role.name}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <div className="space-y-2 px-2 pb-2 pt-1">
            <p className="text-xs font-medium text-muted-foreground">
              Add custom role
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <Input
                id={`custom-role-${eventId}`}
                placeholder="Role name"
                value={customName}
                disabled={disabled || customBusy}
                maxLength={50}
                onChange={(e) => {
                  setCustomName(e.target.value);
                  setCustomError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void submitCustomRole();
                  }
                }}
                className="h-9"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="shrink-0"
                disabled={disabled || customBusy}
                onClick={() => void submitCustomRole()}
              >
                {customBusy ? "Adding…" : "Add"}
              </Button>
            </div>
            {customError ? (
              <p className="text-xs text-destructive" role="alert">
                {customError}
              </p>
            ) : null}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {orderedLabels.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {orderedLabels.map((lbl, i) => {
            const def = selectedForBadges.find(
              (d) => d.slug === lbl.slug && d.name === lbl.name,
            );
            return (
              <Badge
                key={def?.id ?? `role-${lbl.slug ?? "x"}-${lbl.name}-${i}`}
                variant="secondary"
              >
                {lbl.name}
              </Badge>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

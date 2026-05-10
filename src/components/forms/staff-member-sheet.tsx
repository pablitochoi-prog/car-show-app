"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UsPhoneInput } from "@/components/inputs/us-phone-input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  StaffRoleMultiSelect,
  type RoleDefinitionOption,
} from "@/components/forms/staff-role-multi-select";

type SheetMode = "add" | "edit";

export function StaffMemberSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheetMode: SheetMode;
  busy: boolean;
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  roleDefinitions: RoleDefinitionOption[];
  onRoleDefinitionsChange: (roles: RoleDefinitionOption[]) => void;
  selectedRoleIds: string[];
  onSelectedRoleIdsChange: (ids: string[]) => void;
  onSubmit: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const {
    open,
    onOpenChange,
    sheetMode,
    busy,
    eventId,
    firstName,
    lastName,
    email,
    phone,
    onFirstNameChange,
    onLastNameChange,
    onEmailChange,
    onPhoneChange,
    roleDefinitions,
    onRoleDefinitionsChange,
    selectedRoleIds,
    onSelectedRoleIdsChange,
    onSubmit,
    onCancel,
  } = props;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {sheetMode === "add" ? "Add staff member" : "Edit staff member"}
          </SheetTitle>
          <SheetDescription>
            {sheetMode === "add"
              ? "Assign roles and contact details for this event."
              : "Update contact details and roles. Email cannot be changed."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="staff-fn">First name</Label>
              <Input
                id="staff-fn"
                value={firstName}
                onChange={(e) => onFirstNameChange(e.target.value)}
                disabled={busy}
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-ln">Last name</Label>
              <Input
                id="staff-ln"
                value={lastName}
                onChange={(e) => onLastNameChange(e.target.value)}
                disabled={busy}
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="staff-email">Email address</Label>
              <Input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                disabled={busy || sheetMode === "edit"}
                autoComplete="email"
                className={sheetMode === "edit" ? "bg-muted/50" : undefined}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-phone">Phone number</Label>
              <UsPhoneInput
                id="staff-phone"
                value={phone}
                onChange={onPhoneChange}
                disabled={busy}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label id="staff-roles-label">Roles</Label>
            <StaffRoleMultiSelect
              eventId={eventId}
              roleDefinitions={roleDefinitions}
              selectedRoleIds={selectedRoleIds}
              onSelectedRoleIdsChange={onSelectedRoleIdsChange}
              onRoleDefinitionsChange={onRoleDefinitionsChange}
              disabled={busy}
              labelledBy="staff-roles-label"
            />
          </div>
        </div>

        <SheetFooter className="border-t bg-popover px-4 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void onSubmit()}
            disabled={busy}
          >
            {busy ? "Saving…" : sheetMode === "add" ? "Add staff" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

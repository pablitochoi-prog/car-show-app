"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { StaffMember } from "@/lib/event-staff";
import type { RoleDefinitionOption } from "@/components/forms/staff-role-multi-select";
import { EventStaffTable } from "@/components/forms/event-staff-table";
import { StaffMemberSheet } from "@/components/forms/staff-member-sheet";
import { Plus } from "lucide-react";

function parseStaffListResponse(text: string): StaffMember[] | null {
  try {
    const data = JSON.parse(text) as unknown;
    if (Array.isArray(data)) return data as StaffMember[];
    return null;
  } catch {
    return null;
  }
}

function formatRequestError(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Request failed.";
  const err = (payload as { error?: unknown }).error;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const parts = Object.values(err as Record<string, unknown>)
      .flat()
      .filter((v): v is string => typeof v === "string");
    if (parts.length) return parts.join(" ");
  }
  return "Request failed.";
}

export function EventStaffManager({
  eventId,
  initialStaff,
  initialRoleDefinitions,
}: {
  eventId: string;
  initialStaff: StaffMember[];
  initialRoleDefinitions: RoleDefinitionOption[];
}) {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [roleDefinitions, setRoleDefinitions] = useState<RoleDefinitionOption[]>(
    initialRoleDefinitions,
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"add" | "edit">("add");
  const [editUserId, setEditUserId] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function resetFormDefaults() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setError(null);
    setSuccess(null);
    const judge = roleDefinitions.find((r) => r.slug === "judge");
    setSelectedRoleIds(
      judge ? [judge.id] : roleDefinitions[0]?.id ? [roleDefinitions[0].id] : [],
    );
  }

  function openAddSheet() {
    setSheetMode("add");
    setEditUserId(null);
    resetFormDefaults();
    setSheetOpen(true);
  }

  function openEditSheet(member: StaffMember) {
    setSheetMode("edit");
    setEditUserId(member.userId);
    setFirstName(member.firstName ?? "");
    setLastName(member.lastName ?? "");
    setEmail(member.email);
    setPhone(member.phoneDisplay ?? "");
    setSelectedRoleIds(member.roles.map((r) => r.id));
    setError(null);
    setSuccess(null);
    setSheetOpen(true);
  }

  async function persistStaffList(res: Response): Promise<boolean> {
    const text = await res.text();
    const list = parseStaffListResponse(text);
    if (!list) {
      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
      setError(formatRequestError(payload));
      return false;
    }
    setStaff(list);
    return true;
  }

  async function handleSubmitSheet() {
    if (selectedRoleIds.length === 0) {
      setError("Select at least one role.");
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      if (sheetMode === "add") {
        if (!email.trim()) {
          setError("Email is required.");
          setBusy(false);
          return;
        }
        const res = await fetch(`/api/events/${eventId}/staff`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            email: email.trim(),
            firstName: firstName.trim() || undefined,
            lastName: lastName.trim() || undefined,
            phone: phone.trim() || "",
            roleIds: selectedRoleIds,
          }),
        });
        const ok = await persistStaffList(res);
        if (ok) {
          setSheetOpen(false);
          resetFormDefaults();
          setSuccess("Staff member added.");
        }
      } else if (editUserId) {
        const res = await fetch(`/api/events/${eventId}/staff`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            userId: editUserId,
            firstName: firstName.trim() || undefined,
            lastName: lastName.trim() || undefined,
            phone: phone.trim() || "",
            roleIds: selectedRoleIds,
          }),
        });
        const ok = await persistStaffList(res);
        if (ok) {
          setSheetOpen(false);
          setSuccess("Staff member updated.");
        }
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("Remove this person from event staff?")) return;

    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/events/${eventId}/staff`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ userId }),
      });
      const ok = await persistStaffList(res);
      if (ok) {
        if (editUserId === userId) setSheetOpen(false);
        setSuccess("Staff member removed.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <EventStaffTable
        staff={staff}
        busy={busy}
        onEdit={openEditSheet}
        onRemove={handleRemoveMember}
      />

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
          {success}
        </p>
      )}

      <div className="space-y-2">
        <Button
          type="button"
          disabled={busy}
          onClick={() => {
            setError(null);
            setSuccess(null);
            openAddSheet();
          }}
        >
          <Plus className="size-4" aria-hidden />
          Add event staff
        </Button>
        <p className="text-xs text-muted-foreground">
          New staff must already have an account. We match by email and save
          name and phone to their profile.
        </p>
      </div>

      <StaffMemberSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setEditUserId(null);
        }}
        sheetMode={sheetMode}
        busy={busy}
        eventId={eventId}
        firstName={firstName}
        lastName={lastName}
        email={email}
        phone={phone}
        onFirstNameChange={setFirstName}
        onLastNameChange={setLastName}
        onEmailChange={setEmail}
        onPhoneChange={setPhone}
        roleDefinitions={roleDefinitions}
        onRoleDefinitionsChange={setRoleDefinitions}
        selectedRoleIds={selectedRoleIds}
        onSelectedRoleIdsChange={setSelectedRoleIds}
        onSubmit={handleSubmitSheet}
        onCancel={() => setSheetOpen(false)}
      />
    </div>
  );
}

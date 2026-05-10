"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StaffMember } from "@/lib/event-staff";
import { sortStaffRoleBadgesForDisplay } from "@/lib/event-role-labels";
import { Pencil, Trash2 } from "lucide-react";

function staffDisplayName(m: StaffMember) {
  const combined = [m.firstName, m.lastName].filter(Boolean).join(" ").trim();
  return combined || m.name;
}

export function EventStaffTable({
  staff,
  busy,
  onEdit,
  onRemove,
}: {
  staff: StaffMember[];
  busy: boolean;
  onEdit: (member: StaffMember) => void;
  onRemove: (userId: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-4 py-3 sm:px-6">
        <h2 className="text-base font-semibold">Event staff</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {staff.length === 0
            ? "No staff members yet. Add your first staff member."
            : `${staff.length} team member${staff.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {staff.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-2.5 sm:px-6">
                  First + last name
                </th>
                <th scope="col" className="px-4 py-2.5 sm:px-6">
                  Email address
                </th>
                <th scope="col" className="px-4 py-2.5 sm:px-6">
                  Roles
                </th>
                <th scope="col" className="w-[120px] px-4 py-2.5 text-right sm:px-6">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => {
                const roleLabels = sortStaffRoleBadgesForDisplay(
                  member.roles.map((r) => ({
                    slug: r.slug,
                    name: r.name,
                  })),
                );
                return (
                  <tr
                    key={member.userId}
                    className="border-b border-border/80 last:border-0"
                  >
                    <td className="max-w-[200px] px-4 py-3 align-top font-medium sm:px-6">
                      <span className="line-clamp-2">{staffDisplayName(member)}</span>
                    </td>
                    <td className="max-w-[240px] px-4 py-3 align-top text-muted-foreground sm:px-6">
                      <span className="break-all">{member.email}</span>
                    </td>
                    <td className="min-w-[180px] px-4 py-3 align-top sm:px-6">
                      <div className="flex flex-wrap gap-1.5">
                        {roleLabels.map((r, i) => (
                          <Badge
                            key={`${member.userId}-${r.slug ?? "c"}-${r.name}-${i}`}
                            variant="secondary"
                            className="font-normal"
                          >
                            {r.name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right align-top sm:px-6">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          disabled={busy}
                          title="Edit staff member"
                          aria-label="Edit staff member"
                          onClick={() => onEdit(member)}
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:bg-destructive/10"
                          disabled={busy}
                          title="Remove staff member"
                          aria-label="Remove staff member"
                          onClick={() => void onRemove(member.userId)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-6">
          No staff members yet. Add your first staff member.
        </p>
      )}
    </div>
  );
}

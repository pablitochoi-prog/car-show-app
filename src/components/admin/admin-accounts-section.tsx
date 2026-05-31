"use client";

import { useState } from "react";
import { Pencil, Trash2, Check, X, Eye, Ban, PauseCircle, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAdminSearch, AdminSearchBar, AdminEmptyState } from "./admin-search-table";
import { SortableHeader, sortRows, type SortState } from "./sortable-header";
import { AdminUserDetailDrawer } from "./admin-user-detail-drawer";
import { AdminDeleteUserDialog } from "./admin-delete-user-dialog";
import type { AdminAccountRow } from "@/lib/admin-account-rows";

type ColKey =
  | "firstName"
  | "lastName"
  | "email"
  | "platformRole"
  | "status"
  | "createdAt";

const ROLE_OPTIONS = ["USER", "ORGANIZER", "ADMIN"];

function statusVariant(
  status: string,
): "success" | "warning" | "danger" | "muted" {
  if (status === "ACTIVE") return "success";
  if (status === "SUSPENDED") return "warning";
  if (status === "BANNED") return "danger";
  return "muted";
}


export function AdminAccountsSection({
  initialAccounts = [],
}: {
  initialAccounts?: AdminAccountRow[];
}) {
  const { query, setQuery, rows, setRows, loading, loaded, error, search } =
    useAdminSearch<AdminAccountRow>(
      "/api/admin/accounts",
      "accounts",
      initialAccounts,
    );
  const [sort, setSort] = useState<SortState<ColKey>>({
    key: "lastName",
    dir: null,
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminAccountRow | null>(null);

  const sorted = sortRows(rows, sort.key, sort.dir);

  function startEdit(a: AdminAccountRow) {
    setEditId(a.id);
    setEditFirst(a.firstName);
    setEditLast(a.lastName);
    setEditRole(a.platformRole);
  }

  async function handleSave(id: string) {
    setSaving(true);
    const res = await fetch("/api/admin/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        id,
        firstName: editFirst,
        lastName: editLast,
        platformRole: editRole,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { account: AdminAccountRow };
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...data.account } : r)),
      );
      setEditId(null);
    }
    setSaving(false);
  }

  async function patchStatus(
    id: string,
    status: string,
    statusReason?: string,
  ) {
    const res = await fetch("/api/admin/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id, status, statusReason: statusReason ?? null }),
    });
    if (res.ok) {
      const data = (await res.json()) as { account: { status: string } };
      setRows((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: data.account.status } : r,
        ),
      );
    }
  }

  function roleVariant(role: string) {
    if (role === "ADMIN") return "default" as const;
    if (role === "ORGANIZER") return "secondary" as const;
    return "muted" as const;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Search users, edit profiles and login email, change roles, suspend, ban,
        or permanently delete with reassignment.
      </p>
      <AdminSearchBar
        query={query}
        onQueryChange={setQuery}
        onSearch={() => void search()}
        loading={loading}
        placeholder="Filter by name or email…"
      />
      {loaded && rows.length === 0 && (
        <AdminEmptyState message="No users found." error={error} />
      )}
      {sorted.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <SortableHeader
                  label="First Name"
                  sortKey="firstName"
                  current={sort}
                  onSort={setSort}
                />
                <SortableHeader
                  label="Last Name"
                  sortKey="lastName"
                  current={sort}
                  onSort={setSort}
                />
                <SortableHeader
                  label="Email"
                  sortKey="email"
                  current={sort}
                  onSort={setSort}
                />
                <SortableHeader
                  label="Role"
                  sortKey="platformRole"
                  current={sort}
                  onSort={setSort}
                />
                <SortableHeader
                  label="Status"
                  sortKey="status"
                  current={sort}
                  onSort={setSort}
                />
                <SortableHeader
                  label="Joined"
                  sortKey="createdAt"
                  current={sort}
                  onSort={setSort}
                />
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  {editId === a.id ? (
                    <>
                      <td className="px-4 py-2">
                        <Input
                          value={editFirst}
                          onChange={(e) => setEditFirst(e.target.value)}
                          className="h-8 text-sm"
                          disabled={saving}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={editLast}
                          onChange={(e) => setEditLast(e.target.value)}
                          className="h-8 text-sm"
                          disabled={saving}
                        />
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {a.email}
                      </td>
                      <td className="px-4 py-2">
                        <select
                          className="h-8 rounded border bg-background px-1.5 text-xs"
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          disabled={saving}
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={statusVariant(a.status)}>
                          {a.status === "SUSPENDED"
                            ? "Suspended"
                            : a.status === "BANNED"
                              ? "Banned"
                              : "Active"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => void handleSave(a.id)}
                            disabled={saving}
                          >
                            <Check className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => setEditId(null)}
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 font-medium">
                        {a.firstName || "—"}
                      </td>
                      <td className="px-4 py-2.5 font-medium">
                        {a.lastName || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {a.email}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={roleVariant(a.platformRole)}>
                          {a.platformRole}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={statusVariant(a.status)}>
                          {a.status === "SUSPENDED"
                            ? "Suspended"
                            : a.status === "BANNED"
                              ? "Banned"
                              : "Active"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            title="View & edit account"
                            onClick={() => setDetailUserId(a.id)}
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => startEdit(a)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          {a.status !== "SUSPENDED" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-amber-600"
                              title="Suspend"
                              onClick={() => void patchStatus(a.id, "SUSPENDED")}
                            >
                              <PauseCircle className="size-3.5" />
                            </Button>
                          )}
                          {a.status !== "BANNED" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive"
                              title="Ban"
                              onClick={() => void patchStatus(a.id, "BANNED")}
                            >
                              <Ban className="size-3.5" />
                            </Button>
                          )}
                          {a.status !== "ACTIVE" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-emerald-600"
                              title="Reactivate"
                              onClick={() => void patchStatus(a.id, "ACTIVE")}
                            >
                              <UserCheck className="size-3.5" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive"
                            title="Delete"
                            onClick={() => setDeleteUser(a)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {loaded && rows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {rows.length} user{rows.length !== 1 ? "s" : ""}
        </p>
      )}

      <AdminUserDetailDrawer
        userId={detailUserId}
        open={!!detailUserId}
        onClose={() => setDetailUserId(null)}
        onUpdated={() => void search()}
      />

      {deleteUser && (
        <AdminDeleteUserDialog
          userId={deleteUser.id}
          userLabel={`${deleteUser.firstName} ${deleteUser.lastName}`.trim()}
          open={!!deleteUser}
          onClose={() => setDeleteUser(null)}
          onDeleted={() => {
            setDeleteUser(null);
            void search();
          }}
        />
      )}
    </div>
  );
}

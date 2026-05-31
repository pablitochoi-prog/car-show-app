"use client";

import { Suspense, useState, type CSSProperties } from "react";
import {
  Pencil,
  Trash2,
  Check,
  X,
  Eye,
  Ban,
  PauseCircle,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { AdminAccountRow } from "@/lib/admin-account-rows";
import {
  PLATFORM_ROLES,
  USER_STATUSES,
  usersAdminTableConfig,
} from "@/lib/admin-table/users-table-config";
import { AdminUserDetailDrawer } from "./admin-user-detail-drawer";
import { AdminDeleteUserDialog } from "./admin-delete-user-dialog";
import { AdminEmptyState } from "./admin-search-table";
import { useAdminTableFetch } from "./data-table/use-admin-table-fetch";
import { useAdminTableColumns } from "./data-table/use-admin-table-columns";
import { AdminTableHeaderCell } from "./data-table/admin-table-header-cell";
import {
  AdminTablePagination,
  AdminTableSkeleton,
  AdminTableToolbar,
} from "./data-table/admin-table-toolbar";

const ROLE_OPTIONS = ["USER", "ORGANIZER", "ADMIN"];

const COLUMN_DEFS = [
  { id: "firstName", label: "First Name", sortable: true, filterable: true, minWidth: 110 },
  { id: "lastName", label: "Last Name", sortable: true, filterable: true, minWidth: 110 },
  { id: "email", label: "Email", sortable: true, filterable: true, minWidth: 160 },
  { id: "platformRole", label: "Role", sortable: true, filterable: true, enum: true, minWidth: 100 },
  { id: "status", label: "Status", sortable: true, filterable: true, enum: true, minWidth: 100 },
  { id: "createdAt", label: "Joined", sortable: true, filterable: true, dateRange: true, minWidth: 100 },
] as const;

const ACTIONS_COLUMN_WIDTH = 200;

function columnStyle(width: number): CSSProperties {
  return { width, minWidth: width, maxWidth: width };
}

function statusVariant(status: string): "success" | "warning" | "danger" | "muted" {
  if (status === "ACTIVE") return "success";
  if (status === "SUSPENDED") return "warning";
  if (status === "BANNED") return "danger";
  return "muted";
}

function roleVariant(role: string) {
  if (role === "ADMIN") return "default" as const;
  if (role === "ORGANIZER") return "secondary" as const;
  return "muted" as const;
}

function AccountsTableInner() {
  const {
    params,
    qInput,
    setQInput,
    setSort,
    setFilter,
    setFilters,
    setPage,
    setPageSize,
    clearAllFilters,
    activeFilterCount,
    rows,
    setRows,
    meta,
    loading,
    error,
    loaded,
    refetch,
  } = useAdminTableFetch<AdminAccountRow>(
    "/api/admin/accounts",
    "accounts",
    usersAdminTableConfig,
  );

  const columns = useAdminTableColumns(
    "users",
    COLUMN_DEFS.map((c) => c.id),
    { minWidth: Object.fromEntries(COLUMN_DEFS.map((c) => [c.id, c.minWidth])) },
  );

  const [editId, setEditId] = useState<string | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminAccountRow | null>(null);

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

  async function patchStatus(id: string, status: string) {
    const res = await fetch("/api/admin/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id, status, statusReason: null }),
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

  function sortDirFor(columnId: string) {
    return params.sort === columnId ? params.sortDir : null;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Search users, edit profiles and login email, change roles, suspend, ban,
        or permanently delete with reassignment.
      </p>
      <AdminTableToolbar
        qInput={qInput}
        onQChange={setQInput}
        loading={loading}
        placeholder="Search by name or email…"
        activeFilterCount={activeFilterCount}
        onClearAllFilters={clearAllFilters}
        pageSize={params.pageSize}
        onPageSizeChange={setPageSize}
        columnOptions={COLUMN_DEFS.map((c) => ({
          id: c.id,
          label: c.label,
          visible: columns.isVisible(c.id),
          onToggle: (v) => columns.toggleColumn(c.id, v),
        }))}
      />
      {loaded && !loading && rows.length === 0 && (
        <AdminEmptyState message="No users found." error={error} />
      )}
      {(loading || rows.length > 0) && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
            <colgroup>
              {COLUMN_DEFS.filter((c) => columns.isVisible(c.id)).map((col) => (
                <col key={col.id} style={columnStyle(columns.columnWidth(col.id))} />
              ))}
              <col style={columnStyle(ACTIONS_COLUMN_WIDTH)} />
            </colgroup>
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {COLUMN_DEFS.filter((c) => columns.isVisible(c.id)).map((col) => (
                  <AdminTableHeaderCell
                    key={col.id}
                    label={col.label}
                    columnId={col.id}
                    sortable={col.sortable}
                    filterable={col.filterable}
                    enumOptions={
                      col.id === "platformRole"
                        ? PLATFORM_ROLES.map((r) => ({ value: r, label: r }))
                        : col.id === "status"
                          ? USER_STATUSES.map((s) => ({ value: s, label: s }))
                          : undefined
                    }
                    activeSortDir={sortDirFor(col.id)}
                    filterValue={
                      col.id === "createdAt"
                        ? params.filters.createdAtFrom
                        : params.filters[col.id]
                    }
                    filterValueTo={
                      col.id === "createdAt" ? params.filters.createdAtTo : undefined
                    }
                    dateRange={"dateRange" in col ? col.dateRange : false}
                    width={columns.columnWidth(col.id)}
                    onResizeStart={(e) => columns.beginColumnResize(col.id, e.clientX)}
                    onHide={() => columns.hideColumn(col.id)}
                    onSort={(dir) => setSort(col.id, dir)}
                    onFilter={(from, to) => {
                      if (col.id === "createdAt") {
                        setFilters({
                          createdAtFrom: from || null,
                          createdAtTo: to ?? null,
                        });
                      } else {
                        setFilter(col.id, from || null);
                      }
                    }}
                    onClearFilter={() => {
                      if (col.id === "createdAt") {
                        setFilters({ createdAtFrom: null, createdAtTo: null });
                      } else {
                        setFilter(col.id, null);
                      }
                    }}
                  />
                ))}
                <th
                  className="px-2 py-2 text-right"
                  style={columnStyle(ACTIONS_COLUMN_WIDTH)}
                >
                  Actions
                </th>
              </tr>
            </thead>
            {loading ? (
              <AdminTableSkeleton cols={COLUMN_DEFS.length + 1} />
            ) : (
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    {editId === a.id ? (
                      <>
                        {columns.isVisible("firstName") && (
                          <td className="px-4 py-2">
                            <Input
                              value={editFirst}
                              onChange={(e) => setEditFirst(e.target.value)}
                              className="h-8 text-sm"
                              disabled={saving}
                            />
                          </td>
                        )}
                        {columns.isVisible("lastName") && (
                          <td className="px-4 py-2">
                            <Input
                              value={editLast}
                              onChange={(e) => setEditLast(e.target.value)}
                              className="h-8 text-sm"
                              disabled={saving}
                            />
                          </td>
                        )}
                        {columns.isVisible("email") && (
                          <td className="px-4 py-2 text-muted-foreground">{a.email}</td>
                        )}
                        {columns.isVisible("platformRole") && (
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
                        )}
                        {columns.isVisible("status") && (
                          <td className="px-4 py-2">
                            <Badge variant={statusVariant(a.status)}>
                              {a.status === "SUSPENDED"
                                ? "Suspended"
                                : a.status === "BANNED"
                                  ? "Banned"
                                  : "Active"}
                            </Badge>
                          </td>
                        )}
                        {columns.isVisible("createdAt") && (
                          <td className="px-4 py-2 text-muted-foreground">
                            {new Date(a.createdAt).toLocaleDateString()}
                          </td>
                        )}
                        <td
                          className="px-2 py-2 text-right"
                          style={columnStyle(ACTIONS_COLUMN_WIDTH)}
                        >
                          <div className="flex shrink-0 justify-end gap-0.5">
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
                        {columns.isVisible("firstName") && (
                          <td className="px-4 py-2.5 font-medium">{a.firstName || "—"}</td>
                        )}
                        {columns.isVisible("lastName") && (
                          <td className="px-4 py-2.5 font-medium">{a.lastName || "—"}</td>
                        )}
                        {columns.isVisible("email") && (
                          <td className="px-4 py-2.5 text-muted-foreground">{a.email}</td>
                        )}
                        {columns.isVisible("platformRole") && (
                          <td className="px-4 py-2.5">
                            <Badge variant={roleVariant(a.platformRole)}>{a.platformRole}</Badge>
                          </td>
                        )}
                        {columns.isVisible("status") && (
                          <td className="px-4 py-2.5">
                            <Badge variant={statusVariant(a.status)}>
                              {a.status === "SUSPENDED"
                                ? "Suspended"
                                : a.status === "BANNED"
                                  ? "Banned"
                                  : "Active"}
                            </Badge>
                          </td>
                        )}
                        {columns.isVisible("createdAt") && (
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {new Date(a.createdAt).toLocaleDateString()}
                          </td>
                        )}
                        <td
                          className="px-2 py-2.5 text-right"
                          style={columnStyle(ACTIONS_COLUMN_WIDTH)}
                        >
                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-0.5">
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
            )}
          </table>
        </div>
      )}
      {loaded && (
        <AdminTablePagination
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          pageSize={meta.pageSize}
          loading={loading}
          onPageChange={setPage}
        />
      )}

      <AdminUserDetailDrawer
        userId={detailUserId}
        open={!!detailUserId}
        onClose={() => setDetailUserId(null)}
        onUpdated={() => void refetch()}
      />

      {deleteUser && (
        <AdminDeleteUserDialog
          userId={deleteUser.id}
          userLabel={`${deleteUser.firstName} ${deleteUser.lastName}`.trim()}
          open={!!deleteUser}
          onClose={() => setDeleteUser(null)}
          onDeleted={() => {
            setDeleteUser(null);
            void refetch();
          }}
        />
      )}
    </div>
  );
}

export function AdminAccountsSection() {
  return (
    <Suspense fallback={<AdminTableSkeleton rows={8} cols={7} />}>
      <AccountsTableInner />
    </Suspense>
  );
}

"use client";

import { Suspense, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { PlatformFeePromoCode, PlatformFeePromoCodeStatus } from "@prisma/client";
import {
  Archive,
  Ban,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  Pencil,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { promoCodesAdminTableConfig } from "@/lib/admin-table/promo-codes-table-config";
import { TEXT_FILTER_MODES } from "@/lib/admin-table/text-filter";
import type { AdminSortDir } from "@/lib/admin-table/types";
import {
  formatPromoCodeForDisplay,
} from "@/lib/promo-codes/promo-code-generator";
import { PROMO_CODE_STATUS_LABELS } from "@/lib/promo-codes/promo-code-status";
import { useAdminTableFetch } from "./data-table/use-admin-table-fetch";
import { useAdminTableColumns } from "./data-table/use-admin-table-columns";
import { AdminTableHeaderCell } from "./data-table/admin-table-header-cell";
import {
  AdminTablePagination,
  AdminTableSkeleton,
  AdminTableToolbar,
} from "./data-table/admin-table-toolbar";

type PromoCodeRow = PlatformFeePromoCode & {
  redeemedBy: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

const STATUS_OPTIONS = [
  "DRAFT",
  "ACTIVE",
  "RESERVED",
  "REDEEMED",
  "EXPIRED",
  "REVOKED",
  "ARCHIVED",
] as const;

const COLUMN_DEFS = [
  { id: "code", label: "Promo code", sortable: true, filterable: true, minWidth: 220 },
  {
    id: "status",
    label: "Status",
    sortable: true,
    filterable: true,
    filterType: "enum" as const,
    minWidth: 100,
  },
  { id: "createdAt", label: "Created", sortable: true, minWidth: 148 },
  { id: "updatedAt", label: "Modified", sortable: true, minWidth: 148 },
  { id: "expiresAt", label: "Expires", sortable: true, minWidth: 148 },
  {
    id: "organization",
    label: "Organization",
    sortable: false,
    filterable: true,
    minWidth: 140,
  },
  {
    id: "eventName",
    label: "Event name",
    sortable: false,
    filterable: true,
    minWidth: 140,
  },
  {
    id: "eventState",
    label: "Event state",
    sortable: false,
    filterable: true,
    minWidth: 88,
  },
  { id: "redeemedBy", label: "Redeemed by", sortable: false, minWidth: 120 },
  {
    id: "redeemedAt",
    label: "Redeemed date/time",
    sortable: true,
    minWidth: 148,
  },
] as const;

const CHECKBOX_WIDTH = 36;
const ACTIONS_WIDTH = 120;

const COLUMN_MIN_WIDTHS = Object.fromEntries(
  COLUMN_DEFS.map((col) => [col.id, col.minWidth]),
) as Record<string, number>;

function columnStyle(width: number): CSSProperties {
  return { width, minWidth: width, maxWidth: width };
}

function cellClass(extra = ""): string {
  return `px-1.5 py-0.5 text-xs leading-tight ${extra}`.trim();
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Admin table timestamps: MM/DD/YYYY HH:MM:SS (local time). */
function formatTableDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function redeemedByLabel(row: PromoCodeRow): string {
  if (!row.redeemedBy) return "—";
  const name = [row.redeemedBy.firstName, row.redeemedBy.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || row.redeemedBy.email;
}

function orgDisplay(row: PromoCodeRow): string {
  return (
    row.redeemedOrganizationName ??
    row.reservedOrganizationName ??
    "—"
  );
}

function eventNameDisplay(row: PromoCodeRow): string {
  return row.redeemedEventName ?? row.reservedEventName ?? "—";
}

function eventStateDisplay(row: PromoCodeRow): string {
  return row.redeemedEventState ?? row.reservedEventState ?? "—";
}

function statusBadgeVariant(
  status: PlatformFeePromoCodeStatus,
): "default" | "secondary" | "outline" | "danger" {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "REDEEMED":
      return "secondary";
    case "REVOKED":
    case "EXPIRED":
      return "danger";
    default:
      return "outline";
  }
}

function PromoCodesTable() {
  const router = useRouter();
  const {
    params,
    qInput,
    setQInput,
    setFilter,
    setSort,
    setPage,
    setPageSize,
    clearAllFilters,
    activeFilterCount,
    rows,
    meta,
    loading,
    error,
    refetch,
  } = useAdminTableFetch<PromoCodeRow>(
    "/api/admin/promo-codes",
    "promoCodes",
    promoCodesAdminTableConfig,
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState<PlatformFeePromoCodeStatus | "">(
    "",
  );
  const [editId, setEditId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<PlatformFeePromoCodeStatus>("DRAFT");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const columns = useAdminTableColumns(
    "promo-codes-v4",
    [...COLUMN_DEFS.map((c) => c.id), "actions"],
    {
      minWidth: {
        ...COLUMN_MIN_WIDTHS,
        actions: ACTIONS_WIDTH,
      },
    },
  );

  const pageIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  function sortDirFor(columnId: string): AdminSortDir | null {
    return params.sort === columnId ? params.sortDir : null;
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(pageIds) : new Set());
  }

  async function createPromoCodes(count: 1 | 10) {
    setBusy(true);
    setActionError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, status: "DRAFT" }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setActionError(data.error ?? "Could not create promo code.");
        return;
      }
      setSuccessMessage(
        data.message ??
          (count === 1 ? "Promo code created." : "10 promo codes created."),
      );
      await refetch();
      router.refresh();
    } catch {
      setActionError("Could not create promo code.");
    } finally {
      setBusy(false);
    }
  }

  async function patchStatus(id: string, status: PlatformFeePromoCodeStatus) {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/promo-codes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setActionError(data.error ?? "Could not update status.");
        return;
      }
      await refetch();
    } catch {
      setActionError("Could not update status.");
    } finally {
      setBusy(false);
    }
  }

  async function runBulkStatus() {
    if (!bulkStatus || selected.size === 0) return;
    const label = PROMO_CODE_STATUS_LABELS[bulkStatus];
    if (
      !window.confirm(
        `Change ${selected.size} promo code(s) to ${label}? This cannot be undone for redeemed codes.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/promo-codes/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], status: bulkStatus }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setActionError(data.error ?? "Bulk update failed.");
        return;
      }
      setSelected(new Set());
      setBulkStatus("");
      await refetch();
    } catch {
      setActionError("Bulk update failed.");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(row: PromoCodeRow) {
    setEditId(row.id);
    setEditNotes(row.internalNotes ?? "");
    setEditStatus(row.status);
  }

  async function copyPromoCode(row: PromoCodeRow) {
    try {
      await navigator.clipboard.writeText(row.code);
      setCopiedId(row.id);
      setActionError(null);
      window.setTimeout(() => {
        setCopiedId((current) => (current === row.id ? null : current));
      }, 2000);
    } catch {
      setActionError("Could not copy promo code.");
    }
  }

  async function exportSelectedCsv() {
    if (selected.size === 0) return;
    setBusy(true);
    setActionError(null);
    try {
      const ids = [...selected].join(",");
      const res = await fetch(
        `/api/admin/promo-codes/export?ids=${encodeURIComponent(ids)}`,
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setActionError(data.error ?? "Could not export promo codes.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? "promo-codes.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setActionError("Could not export promo codes.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editId) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/promo-codes/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          internalNotes: editNotes.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setActionError(data.error ?? "Could not save.");
        return;
      }
      setEditId(null);
      await refetch();
    } catch {
      setActionError("Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={busy}
          onClick={() => void createPromoCodes(1)}
        >
          {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Create Promo Code
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void createPromoCodes(10)}
        >
          Create 10 Promo Codes
        </Button>
      </div>

      {successMessage ? (
        <p className="text-sm text-emerald-600">{successMessage}</p>
      ) : null}

      <AdminTableToolbar
        qInput={qInput}
        onQChange={setQInput}
        loading={loading}
        placeholder="Search promo codes…"
        activeFilterCount={activeFilterCount}
        onClearAllFilters={clearAllFilters}
        pageSize={params.pageSize}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[10, 25, 50, 100]}
        columnOptions={COLUMN_DEFS.map((col) => ({
          id: col.id,
          label: col.label,
          visible: columns.isVisible(col.id),
          onToggle: (visible) => columns.toggleColumn(col.id, visible),
        }))}
      />

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          <span>{selected.size} selected</span>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void exportSelectedCsv()}
          >
            <Download className="mr-1.5 size-4" />
            Export CSV
          </Button>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={bulkStatus}
            onChange={(e) =>
              setBulkStatus(e.target.value as PlatformFeePromoCodeStatus | "")
            }
          >
            <option value="">Bulk status…</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                → {PROMO_CODE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !bulkStatus}
            onClick={() => void runBulkStatus()}
          >
            Apply
          </Button>
        </div>
      ) : null}

      {actionError ? (
        <p className="text-sm text-red-600">{actionError}</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="w-full max-w-full overflow-x-auto overscroll-x-contain rounded-lg border">
        <table
          className="w-full border-collapse text-left text-xs [&_tbody_tr]:h-7"
          style={{ tableLayout: "fixed", minWidth: "100%" }}
        >
          <colgroup>
            <col style={columnStyle(CHECKBOX_WIDTH)} />
            {COLUMN_DEFS.filter((col) => columns.isVisible(col.id)).map(
              (col) => (
                <col
                  key={col.id}
                  style={columnStyle(columns.columnWidth(col.id))}
                />
              ),
            )}
            <col style={columnStyle(columns.columnWidth("actions"))} />
          </colgroup>
          <thead className="border-b bg-muted/40 text-xs">
            <tr>
              <th
                className="px-1.5 py-1"
                style={columnStyle(CHECKBOX_WIDTH)}
              >
                <input
                  type="checkbox"
                  className="size-3.5"
                  checked={allSelected}
                  onChange={(e) => toggleAll(e.target.checked)}
                  aria-label="Select all on page"
                />
              </th>
              {COLUMN_DEFS.filter((col) => columns.isVisible(col.id)).map(
                (col) => (
                  <AdminTableHeaderCell
                    key={col.id}
                    label={col.label}
                    columnId={col.id}
                    sortable={col.sortable}
                    filterable={"filterable" in col ? col.filterable : false}
                    filterType={"filterType" in col ? col.filterType : "text"}
                    enumOptions={
                      col.id === "status"
                        ? STATUS_OPTIONS.map((s) => ({
                            value: s,
                            label: PROMO_CODE_STATUS_LABELS[s],
                          }))
                        : undefined
                    }
                    textMatchModes={
                      "filterable" in col && col.filterable
                        ? TEXT_FILTER_MODES
                        : undefined
                    }
                    activeSortDir={sortDirFor(col.id)}
                    filterValue={params.filters[col.id]}
                    width={columns.columnWidth(col.id)}
                    compact
                    onResizeStart={(e) =>
                      columns.beginColumnResize(col.id, e.clientX)
                    }
                    onHide={() => columns.hideColumn(col.id)}
                    onSort={(dir) => setSort(col.id, dir)}
                    onFilter={(value) => setFilter(col.id, value || null)}
                    onClearFilter={() => setFilter(col.id, null)}
                  />
                ),
              )}
              <th
                className="relative px-1.5 py-1 text-left text-xs"
                style={columnStyle(columns.columnWidth("actions"))}
              >
                Actions
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize Actions column"
                  className="absolute -right-px top-0 z-10 h-full w-2 cursor-col-resize touch-none hover:bg-primary/30 active:bg-primary/50"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    columns.beginColumnResize("actions", e.clientX);
                  }}
                />
              </th>
            </tr>
          </thead>
          {loading && rows.length === 0 ? (
            <AdminTableSkeleton rows={8} cols={COLUMN_DEFS.length + 2} />
          ) : (
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMN_DEFS.length + 2}
                    className="px-3 py-6 text-center text-sm text-muted-foreground"
                  >
                    No promo codes yet. Click Create promo code to generate one.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className={cellClass()}>
                      <input
                        type="checkbox"
                        className="size-3.5"
                        checked={selected.has(row.id)}
                        onChange={(e) => toggleOne(row.id, e.target.checked)}
                        aria-label={`Select ${row.code}`}
                      />
                    </td>
                    {columns.isVisible("code") ? (
                      <td className={cellClass("overflow-visible font-mono")}>
                        <div className="flex items-center gap-1">
                          <span className="min-w-0 flex-1 truncate">
                            {formatPromoCodeForDisplay(row.code)}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            className="shrink-0"
                            title="Copy promo code"
                            aria-label={`Copy promo code ${formatPromoCodeForDisplay(row.code)}`}
                            onClick={() => void copyPromoCode(row)}
                          >
                            {copiedId === row.id ? (
                              <Check className="size-3 text-emerald-600" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </Button>
                        </div>
                      </td>
                    ) : null}
                    {columns.isVisible("status") ? (
                      <td className={cellClass()}>
                        <Badge
                          variant={statusBadgeVariant(row.status)}
                          className="h-4 px-1 py-0 text-[10px] leading-none"
                        >
                          {PROMO_CODE_STATUS_LABELS[row.status]}
                        </Badge>
                      </td>
                    ) : null}
                    {columns.isVisible("createdAt") ? (
                      <td className={cellClass("whitespace-nowrap tabular-nums")}>
                        {formatTableDateTime(row.createdAt)}
                      </td>
                    ) : null}
                    {columns.isVisible("updatedAt") ? (
                      <td className={cellClass("whitespace-nowrap tabular-nums")}>
                        {formatTableDateTime(row.updatedAt)}
                      </td>
                    ) : null}
                    {columns.isVisible("expiresAt") ? (
                      <td className={cellClass("whitespace-nowrap tabular-nums")}>
                        {formatTableDateTime(row.expiresAt)}
                      </td>
                    ) : null}
                    {columns.isVisible("organization") ? (
                      <td className={cellClass("truncate")}>
                        {orgDisplay(row)}
                      </td>
                    ) : null}
                    {columns.isVisible("eventName") ? (
                      <td className={cellClass("truncate")}>
                        {eventNameDisplay(row)}
                      </td>
                    ) : null}
                    {columns.isVisible("eventState") ? (
                      <td className={cellClass("truncate")}>
                        {eventStateDisplay(row)}
                      </td>
                    ) : null}
                    {columns.isVisible("redeemedBy") ? (
                      <td className={cellClass("truncate")}>
                        {redeemedByLabel(row)}
                      </td>
                    ) : null}
                    {columns.isVisible("redeemedAt") ? (
                      <td className={cellClass("whitespace-nowrap tabular-nums")}>
                        {formatTableDateTime(row.redeemedAt)}
                      </td>
                    ) : null}
                    <td className={cellClass()}>
                      <div className="flex flex-nowrap items-center gap-0">
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          title="Edit"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        {row.status === "DRAFT" ? (
                          <Button
                            type="button"
                            size="icon-xs"
                            variant="ghost"
                            title="Activate"
                            disabled={busy}
                            onClick={() => void patchStatus(row.id, "ACTIVE")}
                          >
                            <CheckCircle2 className="size-3" />
                          </Button>
                        ) : null}
                        {row.status === "ACTIVE" ? (
                          <Button
                            type="button"
                            size="icon-xs"
                            variant="ghost"
                            title="Revoke"
                            disabled={busy}
                            onClick={() => void patchStatus(row.id, "REVOKED")}
                          >
                            <Ban className="size-3" />
                          </Button>
                        ) : null}
                        {row.status !== "ARCHIVED" && row.status !== "REDEEMED" ? (
                          <Button
                            type="button"
                            size="icon-xs"
                            variant="ghost"
                            title="Archive"
                            disabled={busy}
                            onClick={() => void patchStatus(row.id, "ARCHIVED")}
                          >
                            <Archive className="size-3" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          )}
        </table>
      </div>

      <AdminTablePagination
        page={meta.page}
        pageSize={meta.pageSize}
        totalPages={meta.totalPages}
        total={meta.total}
        loading={loading}
        onPageChange={setPage}
      />

      {editId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Edit promo code</h2>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                Status
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(e.target.value as PlatformFeePromoCodeStatus)
                  }
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {PROMO_CODE_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Internal notes
                <textarea
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditId(null)}>
                Cancel
              </Button>
              <Button disabled={busy} onClick={() => void saveEdit()}>
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PromoCodesTableSkeleton() {
  return (
    <div className="w-full max-w-full overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-left text-sm">
        <AdminTableSkeleton rows={5} cols={12} />
      </table>
    </div>
  );
}

export function AdminPromoCodesSection() {
  return (
    <Suspense fallback={<PromoCodesTableSkeleton />}>
      <PromoCodesTable />
    </Suspense>
  );
}

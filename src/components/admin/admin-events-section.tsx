"use client";

import { Suspense, type CSSProperties } from "react";
import Link from "next/link";
import { Trash2, Archive, ArchiveRestore, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { eventsAdminTableConfig, EVENT_STATUSES } from "@/lib/admin-table/events-table-config";
import { useAdminTableFetch } from "./data-table/use-admin-table-fetch";
import { useAdminTableColumns } from "./data-table/use-admin-table-columns";
import { AdminTableHeaderCell } from "./data-table/admin-table-header-cell";
import {
  AdminTablePagination,
  AdminTableSkeleton,
  AdminTableToolbar,
} from "./data-table/admin-table-toolbar";
import { AdminEmptyState } from "./admin-search-table";

type EventRow = {
  id: string;
  name: string;
  showNumber: number;
  city: string | null;
  state: string | null;
  startDate: string;
  status: string;
  orgName: string | null;
  organizers: { name: string; email: string }[];
  registrants: number;
};

const COLUMN_DEFS = [
  { id: "name", label: "Name", sortable: true, filterable: true, minWidth: 128 },
  {
    id: "state",
    label: "State",
    sortable: true,
    filterable: true,
    minWidth: 44,
    align: "center" as const,
    compact: true,
  },
  {
    id: "startDate",
    label: "Date",
    sortable: true,
    filterable: true,
    dateRange: true,
    minWidth: 72,
    compact: true,
  },
  {
    id: "registrants",
    label: "#",
    headerTitle: "Registrants",
    sortable: false,
    filterable: false,
    minWidth: 36,
    align: "center" as const,
    compact: true,
  },
  { id: "orgName", label: "Club", sortable: true, filterable: true, minWidth: 84, compact: true },
  {
    id: "organizer",
    label: "Organizer",
    sortable: false,
    filterable: true,
    minWidth: 104,
    compact: true,
  },
  {
    id: "status",
    label: "Status",
    sortable: true,
    filterable: true,
    enum: true,
    minWidth: 84,
    compact: true,
  },
] as const;

const ACTIONS_COLUMN_WIDTH = 96;

function columnStyle(width: number): CSSProperties {
  return { width, minWidth: width, maxWidth: width };
}

function formatStateAbbrev(state: string | null): string {
  if (!state?.trim()) return "—";
  const trimmed = state.trim();
  return trimmed.length <= 2 ? trimmed.toUpperCase() : trimmed.slice(0, 2).toUpperCase();
}

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
}

function cellPadding(compact?: boolean): string {
  return compact ? "px-1.5 py-2" : "px-3 py-2";
}

function EventsTableInner() {
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
  } = useAdminTableFetch<EventRow>(
    "/api/admin/events",
    "events",
    eventsAdminTableConfig,
  );

  const columns = useAdminTableColumns(
    "events",
    COLUMN_DEFS.map((c) => c.id),
    { minWidth: Object.fromEntries(COLUMN_DEFS.map((c) => [c.id, c.minWidth])) },
  );

  async function handleArchive(id: string, archive: boolean) {
    const newStatus = archive ? "ARCHIVED" : "DRAFT";
    const res = await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id, status: newStatus }),
    });
    if (res.ok) {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this event and all its registrations?")) return;
    await fetch(`/api/admin/events?id=${id}`, { method: "DELETE", credentials: "same-origin" });
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleResetVoting(event: EventRow) {
    const previewRes = await fetch(
      `/api/admin/events/${event.id}/reset-voting`,
      { credentials: "same-origin" },
    );
    const preview = (await previewRes.json()) as {
      error?: string;
      webVotes?: number;
      smsVotes?: number;
      smsSessions?: number;
      totalVotes?: number;
    };
    if (!previewRes.ok) {
      alert(preview.error ?? "Could not load vote counts.");
      return;
    }

    const web = preview.webVotes ?? 0;
    const sms = preview.smsVotes ?? 0;
    const sessions = preview.smsSessions ?? 0;
    const total = preview.totalVotes ?? web + sms;

    if (total === 0 && sessions === 0) {
      alert(`No voting data to reset for "${event.name}".`);
      return;
    }

    const confirmed = confirm(
      `Reset all voting data for "${event.name}"?\n\n` +
        `This will permanently delete:\n` +
        `• ${web} website vote${web === 1 ? "" : "s"}\n` +
        `• ${sms} SMS vote${sms === 1 ? "" : "s"}\n` +
        `• ${sessions} pending SMS session${sessions === 1 ? "" : "s"}\n\n` +
        "Voting categories and settings are kept. This cannot be undone.",
    );
    if (!confirmed) return;

    const res = await fetch(`/api/admin/events/${event.id}/reset-voting`, {
      method: "POST",
      credentials: "same-origin",
    });
    const data = (await res.json()) as { error?: string; totalVotesDeleted?: number };
    if (!res.ok) {
      alert(data.error ?? "Could not reset voting data.");
      return;
    }
    alert(
      `Voting reset for "${event.name}". Removed ${data.totalVotesDeleted ?? total} recorded vote${(data.totalVotesDeleted ?? total) === 1 ? "" : "s"}.`,
    );
  }

  function statusVariant(s: string) {
    if (s === "PUBLISHED" || s === "ACTIVE") return "success" as const;
    if (s === "DRAFT") return "secondary" as const;
    if (s === "ARCHIVED" || s === "CLOSED") return "muted" as const;
    return "default" as const;
  }

  function sortDirFor(columnId: string) {
    return params.sort === columnId ? params.sortDir : null;
  }

  return (
    <div className="space-y-4">
      <AdminTableToolbar
        qInput={qInput}
        onQChange={setQInput}
        loading={loading}
        placeholder="Search events by name or show number…"
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
        <AdminEmptyState message="No events found." error={error} />
      )}
      {(loading || rows.length > 0) && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-xs" style={{ tableLayout: "fixed" }}>
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
                    sortable={"sortable" in col ? col.sortable : false}
                    filterable={"filterable" in col ? col.filterable : false}
                    enumOptions={
                      "enum" in col && col.enum
                        ? EVENT_STATUSES.map((s) => ({ value: s, label: s }))
                        : undefined
                    }
                    activeSortDir={sortDirFor(col.id)}
                    filterValue={
                      col.id === "startDate"
                        ? params.filters.startDateFrom
                        : params.filters[col.id]
                    }
                    filterValueTo={
                      col.id === "startDate" ? params.filters.startDateTo : undefined
                    }
                    dateRange={"dateRange" in col ? col.dateRange : false}
                    width={columns.columnWidth(col.id)}
                    align={"align" in col ? col.align : "left"}
                    compact={"compact" in col ? col.compact : false}
                    headerTitle={"headerTitle" in col ? col.headerTitle : undefined}
                    onResizeStart={(e) => columns.beginColumnResize(col.id, e.clientX)}
                    onHide={() => columns.hideColumn(col.id)}
                    onSort={(dir) => setSort(col.id, dir)}
                    onFilter={(from, to) => {
                      if (col.id === "startDate") {
                        setFilters({
                          startDateFrom: from || null,
                          startDateTo: to ?? null,
                        });
                      } else {
                        setFilter(col.id, from || null);
                      }
                    }}
                    onClearFilter={() => {
                      if (col.id === "startDate") {
                        setFilters({ startDateFrom: null, startDateTo: null });
                      } else {
                        setFilter(col.id, null);
                      }
                    }}
                  />
                ))}
                <th
                  className="px-1 py-2 text-right"
                  style={columnStyle(ACTIONS_COLUMN_WIDTH)}
                  aria-label="Actions"
                >
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            {loading ? (
              <AdminTableSkeleton cols={COLUMN_DEFS.length + 1} />
            ) : (
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    {columns.isVisible("name") && (
                      <td className={`overflow-hidden font-medium ${cellPadding()}`}>
                        <Link
                          href={`/organizer/events/${e.id}/edit`}
                          className="block truncate text-primary hover:underline"
                        >
                          <EventNameWithNumber name={e.name} showNumber={e.showNumber} />
                        </Link>
                      </td>
                    )}
                    {columns.isVisible("state") && (
                      <td
                        className={`text-center tabular-nums text-muted-foreground ${cellPadding(true)}`}
                      >
                        {formatStateAbbrev(e.state)}
                      </td>
                    )}
                    {columns.isVisible("startDate") && (
                      <td className={`whitespace-nowrap text-muted-foreground ${cellPadding(true)}`}>
                        {formatEventDate(e.startDate)}
                      </td>
                    )}
                    {columns.isVisible("registrants") && (
                      <td
                        className={`text-center tabular-nums text-muted-foreground ${cellPadding(true)}`}
                        title={`${e.registrants} registrant${e.registrants === 1 ? "" : "s"}`}
                      >
                        {e.registrants}
                      </td>
                    )}
                    {columns.isVisible("orgName") && (
                      <td className={`overflow-hidden truncate text-muted-foreground ${cellPadding(true)}`}>
                        {e.orgName ?? "—"}
                      </td>
                    )}
                    {columns.isVisible("organizer") && (
                      <td className={`overflow-hidden text-muted-foreground ${cellPadding(true)}`}>
                        {e.organizers.length > 0 ? (
                          <ul className="space-y-0.5">
                            {e.organizers.map((organizer) => (
                              <li
                                key={organizer.email}
                                className="truncate text-foreground"
                                title={`${organizer.name} · ${organizer.email}`}
                              >
                                {organizer.name}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "—"
                        )}
                      </td>
                    )}
                    {columns.isVisible("status") && (
                      <td className={cellPadding(true)}>
                        <Badge variant={statusVariant(e.status)} className="px-1.5 py-0 text-[10px]">
                          {e.status}
                        </Badge>
                      </td>
                    )}
                    <td
                      className="px-1 py-2 text-right"
                      style={columnStyle(ACTIONS_COLUMN_WIDTH)}
                    >
                      <div className="flex shrink-0 items-center justify-end gap-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-6 text-violet-600 hover:bg-violet-500/10"
                          onClick={() => void handleResetVoting(e)}
                          aria-label={`Reset voting for ${e.name}`}
                          title="Reset voting data"
                        >
                          <RotateCcw className="size-3.5" />
                        </Button>
                        {e.status === "ARCHIVED" ? (
                          <Button type="button" variant="ghost" size="icon" className="size-6 text-emerald-600 hover:bg-emerald-500/10" onClick={() => void handleArchive(e.id, false)} aria-label={`Restore ${e.name}`}>
                            <ArchiveRestore className="size-3.5" />
                          </Button>
                        ) : (
                          <Button type="button" variant="ghost" size="icon" className="size-6 text-amber-600 hover:bg-amber-500/10" onClick={() => void handleArchive(e.id, true)} aria-label={`Archive ${e.name}`}>
                            <Archive className="size-3.5" />
                          </Button>
                        )}
                        <Button type="button" variant="ghost" size="icon" className="size-6 text-destructive hover:bg-destructive/10" onClick={() => void handleDelete(e.id)} aria-label={`Delete ${e.name}`}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
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
    </div>
  );
}

export function AdminEventsSection() {
  return (
    <Suspense fallback={<AdminTableSkeleton rows={8} cols={8} />}>
      <EventsTableInner />
    </Suspense>
  );
}

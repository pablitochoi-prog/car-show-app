"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ExternalLink, Trash2, Archive, ArchiveRestore, RotateCcw } from "lucide-react";
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
  { id: "name", label: "Name", sortable: true, filterable: true, minWidth: 160 },
  { id: "location", label: "Location", sortable: true, filterable: true, minWidth: 120 },
  { id: "startDate", label: "Date", sortable: true, filterable: true, dateRange: true, minWidth: 100 },
  { id: "registrants", label: "Registrants", sortable: false, filterable: false, minWidth: 90 },
  { id: "orgName", label: "Club", sortable: true, filterable: true, minWidth: 120 },
  { id: "organizer", label: "Event Organizer", sortable: false, filterable: true, minWidth: 140 },
  { id: "status", label: "Status", sortable: true, filterable: true, enum: true, minWidth: 100 },
] as const;

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
          <table className="w-full min-w-[950px] text-sm" style={{ tableLayout: "fixed" }}>
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
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            {loading ? (
              <AdminTableSkeleton cols={COLUMN_DEFS.length + 1} />
            ) : (
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    {columns.isVisible("name") && (
                      <td className="px-4 py-2.5 font-medium">
                        <EventNameWithNumber name={e.name} showNumber={e.showNumber} />
                      </td>
                    )}
                    {columns.isVisible("location") && (
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {[e.city, e.state].filter(Boolean).join(", ") || "—"}
                      </td>
                    )}
                    {columns.isVisible("startDate") && (
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {new Date(e.startDate).toLocaleDateString()}
                      </td>
                    )}
                    {columns.isVisible("registrants") && (
                      <td className="px-4 py-2.5 text-muted-foreground">{e.registrants}</td>
                    )}
                    {columns.isVisible("orgName") && (
                      <td className="px-4 py-2.5 text-muted-foreground">{e.orgName ?? "—"}</td>
                    )}
                    {columns.isVisible("organizer") && (
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {e.organizers.length > 0 ? (
                          <ul className="space-y-1">
                            {e.organizers.map((organizer) => (
                              <li key={organizer.email}>
                                <span className="text-foreground">{organizer.name}</span>
                                <span className="block text-xs">{organizer.email}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "—"
                        )}
                      </td>
                    )}
                    {columns.isVisible("status") && (
                      <td className="px-4 py-2.5">
                        <Badge variant={statusVariant(e.status)}>{e.status}</Badge>
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/organizer/events/${e.id}/edit`}>
                          <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`Edit ${e.name}`}>
                            <ExternalLink className="size-3.5" />
                          </Button>
                        </Link>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-violet-600 hover:bg-violet-500/10"
                          onClick={() => void handleResetVoting(e)}
                          aria-label={`Reset voting for ${e.name}`}
                          title="Reset voting data"
                        >
                          <RotateCcw className="size-3.5" />
                        </Button>
                        {e.status === "ARCHIVED" ? (
                          <Button type="button" variant="ghost" size="icon" className="size-7 text-emerald-600 hover:bg-emerald-500/10" onClick={() => void handleArchive(e.id, false)} aria-label={`Restore ${e.name}`}>
                            <ArchiveRestore className="size-3.5" />
                          </Button>
                        ) : (
                          <Button type="button" variant="ghost" size="icon" className="size-7 text-amber-600 hover:bg-amber-500/10" onClick={() => void handleArchive(e.id, true)} aria-label={`Archive ${e.name}`}>
                            <Archive className="size-3.5" />
                          </Button>
                        )}
                        <Button type="button" variant="ghost" size="icon" className="size-7 text-destructive hover:bg-destructive/10" onClick={() => void handleDelete(e.id)} aria-label={`Delete ${e.name}`}>
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

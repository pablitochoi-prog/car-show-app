"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminSearch, AdminSearchBar, AdminEmptyState } from "./admin-search-table";
import { SortableHeader, sortRows, type SortState } from "./sortable-header";

type EventRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  startDate: string;
  startTime: string | null;
  status: string;
  orgName: string | null;
  registrants: number;
};

type ColKey = "name" | "city" | "startDate" | "startTime" | "orgName" | "status" | "registrants";

export function AdminEventsSection() {
  const { query, setQuery, rows, setRows, loading, loaded, search } =
    useAdminSearch<EventRow>("/api/admin/events", "events");
  const [sort, setSort] = useState<SortState<ColKey>>({ key: "name", dir: null });

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

  function statusVariant(s: string) {
    if (s === "PUBLISHED" || s === "ACTIVE") return "success" as const;
    if (s === "DRAFT") return "secondary" as const;
    if (s === "ARCHIVED" || s === "CLOSED") return "muted" as const;
    return "default" as const;
  }

  const sorted = sortRows(rows, sort.key, sort.dir);

  return (
    <div className="space-y-4">
      <AdminSearchBar query={query} onQueryChange={setQuery} onSearch={() => void search()} loading={loading} placeholder="Filter events by name…" />
      {loaded && rows.length === 0 && <AdminEmptyState message="No events found." />}
      {sorted.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[950px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <SortableHeader label="Name" sortKey="name" current={sort} onSort={setSort} />
                <SortableHeader label="Location" sortKey="city" current={sort} onSort={setSort} />
                <SortableHeader label="Date" sortKey="startDate" current={sort} onSort={setSort} />
                <SortableHeader label="Time" sortKey="startTime" current={sort} onSort={setSort} />
                <SortableHeader label="Registrants" sortKey="registrants" current={sort} onSort={setSort} />
                <SortableHeader label="Club" sortKey="orgName" current={sort} onSort={setSort} />
                <SortableHeader label="Status" sortKey="status" current={sort} onSort={setSort} />
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-medium">{e.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{[e.city, e.state].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{new Date(e.startDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{e.startTime ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{e.registrants}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{e.orgName ?? "—"}</td>
                  <td className="px-4 py-2.5"><Badge variant={statusVariant(e.status)}>{e.status}</Badge></td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/organizer/events/${e.id}/edit`}>
                        <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`Edit ${e.name}`}><ExternalLink className="size-3.5" /></Button>
                      </Link>
                      {e.status === "ARCHIVED" ? (
                        <Button type="button" variant="ghost" size="icon" className="size-7 text-emerald-600 hover:bg-emerald-500/10" onClick={() => void handleArchive(e.id, false)} aria-label={`Restore ${e.name}`}><ArchiveRestore className="size-3.5" /></Button>
                      ) : (
                        <Button type="button" variant="ghost" size="icon" className="size-7 text-amber-600 hover:bg-amber-500/10" onClick={() => void handleArchive(e.id, true)} aria-label={`Archive ${e.name}`}><Archive className="size-3.5" /></Button>
                      )}
                      <Button type="button" variant="ghost" size="icon" className="size-7 text-destructive hover:bg-destructive/10" onClick={() => void handleDelete(e.id)} aria-label={`Delete ${e.name}`}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {loaded && rows.length > 0 && <p className="text-xs text-muted-foreground">Showing {rows.length} event{rows.length !== 1 ? "s" : ""}</p>}
    </div>
  );
}

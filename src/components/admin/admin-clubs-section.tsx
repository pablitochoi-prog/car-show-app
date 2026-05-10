"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminSearch, AdminSearchBar, AdminEmptyState } from "./admin-search-table";
import { SortableHeader, sortRows, type SortState } from "./sortable-header";

type ClubRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  clubState: string | null;
  archived: boolean;
  memberCount: number;
  eventCount: number;
  organizer: string | null;
};

type ColKey = "name" | "city" | "organizer" | "memberCount" | "eventCount" | "archived";

export function AdminClubsSection() {
  const { query, setQuery, rows, setRows, loading, loaded, search } =
    useAdminSearch<ClubRow>("/api/admin/clubs", "clubs");
  const [sort, setSort] = useState<SortState<ColKey>>({ key: "name", dir: null });

  async function handleArchiveToggle(c: ClubRow) {
    if (!confirm(`${c.archived ? "Restore" : "Archive"} "${c.name}"?`)) return;
    const res = await fetch("/api/admin/clubs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id: c.id, archive: !c.archived }),
    });
    if (res.ok) setRows((prev) => prev.map((r) => (r.id === c.id ? { ...r, archived: !c.archived } : r)));
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this club and all its data?")) return;
    await fetch(`/api/admin/clubs?id=${id}`, { method: "DELETE", credentials: "same-origin" });
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const sorted = sortRows(rows, sort.key, sort.dir);

  return (
    <div className="space-y-4">
      <AdminSearchBar query={query} onQueryChange={setQuery} onSearch={() => void search()} loading={loading} placeholder="Filter clubs by name…" />
      {loaded && rows.length === 0 && <AdminEmptyState message="No clubs found." />}
      {sorted.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <SortableHeader label="Name" sortKey="name" current={sort} onSort={setSort} />
                <SortableHeader label="Location" sortKey="city" current={sort} onSort={setSort} />
                <SortableHeader label="Organizer" sortKey="organizer" current={sort} onSort={setSort} />
                <SortableHeader label="Members" sortKey="memberCount" current={sort} onSort={setSort} />
                <SortableHeader label="Events" sortKey="eventCount" current={sort} onSort={setSort} />
                <SortableHeader label="Status" sortKey="archived" current={sort} onSort={setSort} />
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-medium">{c.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{[c.city, c.state ?? c.clubState].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.organizer ?? "—"}</td>
                  <td className="px-4 py-2.5">{c.memberCount}</td>
                  <td className="px-4 py-2.5">{c.eventCount}</td>
                  <td className="px-4 py-2.5">{c.archived ? <span className="text-amber-600">Archived</span> : <span className="text-emerald-600">Active</span>}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/dashboard/clubs/${c.id}/edit`}>
                        <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`Edit ${c.name}`}><ExternalLink className="size-3.5" /></Button>
                      </Link>
                      <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => void handleArchiveToggle(c)} aria-label={c.archived ? `Restore ${c.name}` : `Archive ${c.name}`} title={c.archived ? "Restore" : "Archive"}>{c.archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}</Button>
                      <Button type="button" variant="ghost" size="icon" className="size-7 text-destructive hover:bg-destructive/10" onClick={() => void handleDelete(c.id)} aria-label={`Delete ${c.name}`}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {loaded && rows.length > 0 && <p className="text-xs text-muted-foreground">Showing {rows.length} club{rows.length !== 1 ? "s" : ""}</p>}
    </div>
  );
}

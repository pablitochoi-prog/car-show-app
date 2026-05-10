"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminSearch, AdminSearchBar, AdminEmptyState } from "./admin-search-table";
import { SortableHeader, sortRows, type SortState } from "./sortable-header";

type VehicleRow = {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  vin: string | null;
  nickname: string | null;
  archivedAt: string | null;
  ownerName: string;
  ownerEmail: string;
};

type ColKey = "year" | "make" | "model" | "trim" | "vin" | "archivedAt" | "ownerName" | "ownerEmail";

export function AdminVehiclesSection() {
  const { query, setQuery, rows, setRows, loading, loaded, search } =
    useAdminSearch<VehicleRow>("/api/admin/vehicles", "vehicles");
  const [sort, setSort] = useState<SortState<ColKey>>({ key: "year", dir: null });

  async function handleArchive(id: string, archive: boolean) {
    const res = await fetch("/api/admin/vehicles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id, archive }),
    });
    if (res.ok) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, archivedAt: archive ? new Date().toISOString() : null } : r
        ),
      );
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this vehicle?")) return;
    await fetch(`/api/admin/vehicles?id=${id}`, { method: "DELETE", credentials: "same-origin" });
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const sorted = sortRows(rows, sort.key, sort.dir);

  return (
    <div className="space-y-4">
      <AdminSearchBar query={query} onQueryChange={setQuery} onSearch={() => void search()} loading={loading} placeholder="Filter by make, model, VIN…" />
      {loaded && rows.length === 0 && <AdminEmptyState message="No vehicles found." />}
      {sorted.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <SortableHeader label="Year" sortKey="year" current={sort} onSort={setSort} />
                <SortableHeader label="Make" sortKey="make" current={sort} onSort={setSort} />
                <SortableHeader label="Model" sortKey="model" current={sort} onSort={setSort} />
                <SortableHeader label="Trim" sortKey="trim" current={sort} onSort={setSort} />
                <SortableHeader label="VIN" sortKey="vin" current={sort} onSort={setSort} />
                <SortableHeader label="Owner" sortKey="ownerName" current={sort} onSort={setSort} />
                <SortableHeader label="Status" sortKey="archivedAt" current={sort} onSort={setSort} />
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((v) => (
                <tr key={v.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5">{v.year}</td>
                  <td className="px-4 py-2.5 font-medium">{v.make}</td>
                  <td className="px-4 py-2.5">{v.model}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{v.trim || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{v.vin || "—"}</td>
                  <td className="px-4 py-2.5">{v.ownerName}</td>
                  <td className="px-4 py-2.5">{v.archivedAt ? <Badge variant="muted">Hidden</Badge> : <Badge variant="success">Active</Badge>}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/dashboard/vehicles/${v.id}/edit`}>
                        <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`Edit ${v.year} ${v.make} ${v.model}`}><ExternalLink className="size-3.5" /></Button>
                      </Link>
                      {v.archivedAt ? (
                        <Button type="button" variant="ghost" size="icon" className="size-7 text-emerald-600 hover:bg-emerald-500/10" onClick={() => void handleArchive(v.id, false)} aria-label={`Restore ${v.year} ${v.make} ${v.model}`}><ArchiveRestore className="size-3.5" /></Button>
                      ) : (
                        <Button type="button" variant="ghost" size="icon" className="size-7 text-amber-600 hover:bg-amber-500/10" onClick={() => void handleArchive(v.id, true)} aria-label={`Hide ${v.year} ${v.make} ${v.model}`}><Archive className="size-3.5" /></Button>
                      )}
                      <Button type="button" variant="ghost" size="icon" className="size-7 text-destructive hover:bg-destructive/10" onClick={() => void handleDelete(v.id)} aria-label={`Delete ${v.year} ${v.make} ${v.model}`}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {loaded && rows.length > 0 && <p className="text-xs text-muted-foreground">Showing {rows.length} vehicle{rows.length !== 1 ? "s" : ""}</p>}
    </div>
  );
}

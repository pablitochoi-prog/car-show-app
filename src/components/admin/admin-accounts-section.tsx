"use client";

import { useState } from "react";
import { Pencil, Trash2, Check, X, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAdminSearch, AdminSearchBar, AdminEmptyState } from "./admin-search-table";
import { SortableHeader, sortRows, type SortState } from "./sortable-header";

type AccountRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  platformRole: string;
  archivedAt: string | null;
  createdAt: string;
};

type ColKey = "firstName" | "lastName" | "email" | "platformRole" | "archivedAt" | "createdAt";
const ROLE_OPTIONS = ["USER", "ORGANIZER", "ADMIN"];

export function AdminAccountsSection() {
  const { query, setQuery, rows, setRows, loading, loaded, search } =
    useAdminSearch<AccountRow>("/api/admin/accounts", "accounts");
  const [sort, setSort] = useState<SortState<ColKey>>({ key: "lastName", dir: null });
  const [editId, setEditId] = useState<string | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);

  const sorted = sortRows(rows, sort.key, sort.dir);

  function startEdit(a: AccountRow) {
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
      body: JSON.stringify({ id, firstName: editFirst, lastName: editLast, platformRole: editRole }),
    });
    if (res.ok) {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, firstName: editFirst, lastName: editLast, platformRole: editRole } : r)));
      setEditId(null);
    }
    setSaving(false);
  }

  async function handleArchive(id: string, archive: boolean) {
    const res = await fetch("/api/admin/accounts", {
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

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Permanently delete user "${name}"?`)) return;
    const res = await fetch(`/api/admin/accounts?id=${id}`, { method: "DELETE", credentials: "same-origin" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) { alert(data.error ?? "Could not delete."); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function roleVariant(role: string) {
    if (role === "ADMIN") return "default" as const;
    if (role === "ORGANIZER") return "secondary" as const;
    return "muted" as const;
  }

  return (
    <div className="space-y-4">
      <AdminSearchBar query={query} onQueryChange={setQuery} onSearch={() => void search()} loading={loading} placeholder="Filter by name or email…" />
      {loaded && rows.length === 0 && <AdminEmptyState message="No accounts found." />}
      {sorted.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <SortableHeader label="First Name" sortKey="firstName" current={sort} onSort={setSort} />
                <SortableHeader label="Last Name" sortKey="lastName" current={sort} onSort={setSort} />
                <SortableHeader label="Email" sortKey="email" current={sort} onSort={setSort} />
                <SortableHeader label="Role" sortKey="platformRole" current={sort} onSort={setSort} />
                <SortableHeader label="Status" sortKey="archivedAt" current={sort} onSort={setSort} />
                <SortableHeader label="Joined" sortKey="createdAt" current={sort} onSort={setSort} />
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  {editId === a.id ? (
                    <>
                      <td className="px-4 py-2"><Input value={editFirst} onChange={(e) => setEditFirst(e.target.value)} className="h-8 text-sm" placeholder="First" disabled={saving} /></td>
                      <td className="px-4 py-2"><Input value={editLast} onChange={(e) => setEditLast(e.target.value)} className="h-8 text-sm" placeholder="Last" disabled={saving} /></td>
                      <td className="px-4 py-2 text-muted-foreground">{a.email}</td>
                      <td className="px-4 py-2">
                        <select className="h-8 rounded border bg-background px-1.5 text-xs" value={editRole} onChange={(e) => setEditRole(e.target.value)} disabled={saving}>
                          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{a.archivedAt ? <Badge variant="muted">Hidden</Badge> : <Badge variant="success">Active</Badge>}</td>
                      <td className="px-4 py-2 text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="size-7" onClick={() => void handleSave(a.id)} disabled={saving} aria-label="Save"><Check className="size-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditId(null)} aria-label="Cancel"><X className="size-3.5" /></Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 font-medium">{a.firstName || "—"}</td>
                      <td className="px-4 py-2.5 font-medium">{a.lastName || "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{a.email}</td>
                      <td className="px-4 py-2.5"><Badge variant={roleVariant(a.platformRole)}>{a.platformRole}</Badge></td>
                      <td className="px-4 py-2.5">{a.archivedAt ? <Badge variant="muted">Hidden</Badge> : <Badge variant="success">Active</Badge>}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => startEdit(a)} aria-label={`Edit ${a.firstName} ${a.lastName}`}><Pencil className="size-3.5" /></Button>
                          {a.archivedAt ? (
                            <Button type="button" variant="ghost" size="icon" className="size-7 text-emerald-600 hover:bg-emerald-500/10" onClick={() => void handleArchive(a.id, false)} aria-label={`Restore ${a.firstName} ${a.lastName}`}><ArchiveRestore className="size-3.5" /></Button>
                          ) : (
                            <Button type="button" variant="ghost" size="icon" className="size-7 text-amber-600 hover:bg-amber-500/10" onClick={() => void handleArchive(a.id, true)} aria-label={`Hide ${a.firstName} ${a.lastName}`}><Archive className="size-3.5" /></Button>
                          )}
                          <Button type="button" variant="ghost" size="icon" className="size-7 text-destructive hover:bg-destructive/10" onClick={() => void handleDelete(a.id, `${a.firstName} ${a.lastName}`)} aria-label={`Delete ${a.firstName} ${a.lastName}`}><Trash2 className="size-3.5" /></Button>
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
      {loaded && rows.length > 0 && <p className="text-xs text-muted-foreground">Showing {rows.length} account{rows.length !== 1 ? "s" : ""}</p>}
    </div>
  );
}

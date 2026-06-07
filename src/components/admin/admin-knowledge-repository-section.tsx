"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { KnowledgeArticle } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getHelpCategoryLabel, HELP_CATEGORIES } from "@/lib/help/help-categories";
import { HELP_AUDIENCE_LABELS } from "@/lib/help/help-types";
import { knowledgeArticlesAdminTableConfig } from "@/lib/admin-table/knowledge-articles-table-config";
import { useAdminTableFetch } from "./data-table/use-admin-table-fetch";
import {
  AdminTablePagination,
  AdminTableSkeleton,
  AdminTableToolbar,
} from "./data-table/admin-table-toolbar";

function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function KnowledgeRepositoryTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    params,
    qInput,
    setQInput,
    setFilter,
    setPage,
    setPageSize,
    clearAllFilters,
    activeFilterCount,
    rows,
    meta,
    loading,
    error,
    refetch,
  } = useAdminTableFetch<KnowledgeArticle>(
    "/api/admin/knowledge-articles",
    "articles",
    knowledgeArticlesAdminTableConfig,
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const pageIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const allSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

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

  async function runBulk(action: "publish" | "unpublish" | "archive") {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/knowledge-articles/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setActionError(data.error ?? "Bulk action failed.");
        return;
      }
      setSelected(new Set());
      await refetch();
      router.refresh();
    } catch {
      setActionError("Bulk action failed.");
    } finally {
      setBusy(false);
    }
  }

  function exportUrl(selectedOnly: boolean): string {
    const base = "/api/admin/knowledge-articles/export";
    if (selectedOnly && selected.size > 0) {
      return `${base}?ids=${[...selected].join(",")}`;
    }
    const qs = searchParams.toString();
    return qs ? `${base}?${qs}` : base;
  }

  async function seedFromFiles() {
    if (
      !window.confirm(
        "Seed articles from the file library? Existing slugs will be skipped.",
      )
    ) {
      return;
    }
    setBusy(true);
    setActionError(null);
    setSeedMessage(null);
    try {
      const res = await fetch("/api/admin/knowledge-articles/seed", {
        method: "POST",
      });
      const data = (await res.json()) as {
        error?: string;
        created?: number;
        skipped?: number;
      };
      if (!res.ok) {
        setActionError(data.error ?? "Seed failed.");
        return;
      }
      setSeedMessage(
        `Seeded ${data.created ?? 0} article(s); skipped ${data.skipped ?? 0} existing slug(s).`,
      );
      await refetch();
      router.refresh();
    } catch {
      setActionError("Seed failed.");
    } finally {
      setBusy(false);
    }
  }

  async function duplicateArticle(id: string) {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/knowledge-articles/${id}/duplicate`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string; article?: { id: string } };
      if (!res.ok) {
        setActionError(data.error ?? "Could not duplicate.");
        return;
      }
      await refetch();
      if (data.article?.id) {
        router.push(`/admin/knowledge/${data.article.id}/edit`);
      }
    } catch {
      setActionError("Could not duplicate.");
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(row: KnowledgeArticle) {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/knowledge-articles/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rowToPatchBody(row),
          published: !row.published,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setActionError(data.error ?? "Could not update publish status.");
        return;
      }
      await refetch();
    } catch {
      setActionError("Could not update publish status.");
    } finally {
      setBusy(false);
    }
  }

  async function archiveArticle(id: string) {
    if (!window.confirm("Archive this article? It will be hidden from the public Help Center.")) {
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/knowledge-articles/${id}/archive`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setActionError(data.error ?? "Could not archive.");
        return;
      }
      await refetch();
    } catch {
      setActionError("Could not archive.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Manage Help Center articles. DB articles override file articles by slug
          on the public site.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void seedFromFiles()} disabled={busy}>
            Seed from file library
          </Button>
          <Link href="/admin/knowledge/new">
            <Button size="sm">New article</Button>
          </Link>
        </div>
      </div>

      <AdminTableToolbar
        qInput={qInput}
        onQChange={setQInput}
        loading={loading}
        placeholder="Search title, slug, keywords, body…"
        activeFilterCount={activeFilterCount}
        onClearAllFilters={clearAllFilters}
        pageSize={params.pageSize}
        onPageSizeChange={setPageSize}
      />

      <div className="flex flex-wrap gap-2">
        <select
          value={params.filters.category ?? ""}
          onChange={(e) => setFilter("category", e.target.value || null)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {HELP_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
        <select
          value={params.filters.audience ?? ""}
          onChange={(e) => setFilter("audience", e.target.value || null)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          aria-label="Filter by audience"
        >
          <option value="">All audiences</option>
          {Object.entries(HELP_AUDIENCE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={params.filters.published ?? ""}
          onChange={(e) => setFilter("published", e.target.value || null)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          aria-label="Filter by published status"
        >
          <option value="">Published: all</option>
          <option value="true">Published</option>
          <option value="false">Unpublished</option>
        </select>
        <select
          value={params.filters.visibility ?? ""}
          onChange={(e) => setFilter("visibility", e.target.value || null)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          aria-label="Filter by visibility"
        >
          <option value="">Visibility: all</option>
          <option value="public">public</option>
          <option value="authenticated">authenticated</option>
          <option value="organizerOnly">organizerOnly</option>
          <option value="adminOnly">adminOnly</option>
        </select>
      </div>

      {someSelected ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void runBulk("publish")}>
            Publish
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void runBulk("unpublish")}>
            Unpublish
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void runBulk("archive")}>
            Archive
          </Button>
          <a href={exportUrl(true)}>
            <Button type="button" size="sm" variant="outline" disabled={busy}>
              Export selected CSV
            </Button>
          </a>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <a href={exportUrl(false)}>
          <Button type="button" size="sm" variant="outline">
            Export all filtered CSV
          </Button>
        </a>
      </div>

      {seedMessage ? (
        <p className="text-sm text-muted-foreground" role="status">
          {seedMessage}
        </p>
      ) : null}
      {actionError ? (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <AdminTableSkeleton cols={8} rows={6} />
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No knowledge articles yet. Use <strong>Seed from file library</strong> to
          import the 27 starter articles, or create a new article.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs">
              <tr>
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    aria-label="Select all visible rows"
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
                <th className="px-3 py-2">Sort</th>
                <th className="px-3 py-2">Published</th>
                <th className="px-3 py-2">Visibility</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Audience</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Featured</th>
                <th className="px-3 py-2">Popular</th>
                <th className="px-3 py-2">Reviewed</th>
                <th className="px-3 py-2">Updated</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      aria-label={`Select ${row.title}`}
                      onChange={(e) => toggleOne(row.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-3 py-2 tabular-nums">{row.sortOrder}</td>
                  <td className="px-3 py-2">
                    <Badge variant={row.published ? "default" : "secondary"}>
                      {row.published ? "Yes" : "No"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline">{row.visibility}</Badge>
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2 font-medium">
                    {row.title}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.slug}</td>
                  <td className="px-3 py-2 text-xs">
                    {HELP_AUDIENCE_LABELS[row.audience as keyof typeof HELP_AUDIENCE_LABELS] ?? row.audience}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {getHelpCategoryLabel(row.category as never)}
                  </td>
                  <td className="px-3 py-2">{row.featured ? "Yes" : "—"}</td>
                  <td className="px-3 py-2">{row.popular ? "Yes" : "—"}</td>
                  <td className="px-3 py-2 text-xs">{formatDate(row.lastReviewedAt)}</td>
                  <td className="px-3 py-2 text-xs">{formatDate(row.updatedAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Link
                        href={`/admin/knowledge/${row.id}/edit`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Edit
                      </Link>
                      <a
                        href={`/help/${row.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Preview
                      </a>
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        disabled={busy}
                        onClick={() => void duplicateArticle(row.id)}
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        disabled={busy}
                        onClick={() => void togglePublish(row)}
                      >
                        {row.published ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        type="button"
                        className="text-xs font-medium text-destructive hover:underline"
                        disabled={busy}
                        onClick={() => void archiveArticle(row.id)}
                      >
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminTablePagination
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        pageSize={meta.pageSize}
        loading={loading}
        onPageChange={setPage}
      />
    </div>
  );
}

function rowToPatchBody(row: KnowledgeArticle) {
  return {
    title: row.title,
    slug: row.slug,
    shortDescription: row.shortDescription,
    audience: row.audience,
    category: row.category,
    visibility: row.visibility,
    published: row.published,
    featured: row.featured,
    popular: row.popular,
    sortOrder: row.sortOrder,
    keywords: row.keywords,
    relatedWebsitePages: row.relatedWebsitePages,
    relatedFeatures: row.relatedFeatures,
    relatedArticleIds: row.relatedArticleIds,
    whoThisIsFor: row.whoThisIsFor,
    whatThisHelpsYouDo: row.whatThisHelpsYouDo,
    beforeYouStart: row.beforeYouStart,
    stepByStepInstructions: row.stepByStepInstructions,
    whatHappensNext: row.whatHappensNext,
    frequentlyAskedQuestions: row.frequentlyAskedQuestions,
    articleBody: row.articleBody,
    chatbotSummary: row.chatbotSummary,
    chatbotKeywords: row.chatbotKeywords,
    lastReviewedAt: row.lastReviewedAt.toISOString().slice(0, 10),
  };
}

export function AdminKnowledgeRepositorySection() {
  return (
    <Suspense fallback={<AdminTableSkeleton cols={8} rows={6} />}>
      <KnowledgeRepositoryTable />
    </Suspense>
  );
}

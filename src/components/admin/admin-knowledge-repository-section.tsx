"use client";

import { Suspense, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { KnowledgeArticle } from "@prisma/client";
import {
  Archive,
  CheckCircle2,
  CircleX,
  Copy,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getHelpCategoryLabel, HELP_CATEGORIES } from "@/lib/help/help-categories";
import { HELP_AUDIENCE_LABELS, HELP_AUDIENCES } from "@/lib/help/help-types";
import { knowledgeArticlesAdminTableConfig } from "@/lib/admin-table/knowledge-articles-table-config";
import {
  CONTAINS_TEXT_FILTER_MODES,
  TEXT_FILTER_MODES,
} from "@/lib/admin-table/text-filter";
import type { TextFilterMode } from "@/lib/admin-table/text-filter";
import type { AdminSortDir } from "@/lib/admin-table/types";
import { useAdminTableFetch } from "./data-table/use-admin-table-fetch";
import { useAdminTableColumns } from "./data-table/use-admin-table-columns";
import { AdminTableHeaderCell } from "./data-table/admin-table-header-cell";
import { formatKnowledgeArticleNumber } from "@/lib/help/knowledge-article-number";
import { AdminKnowledgeImportDialog } from "./admin-knowledge-import-dialog";
import {
  AdminTablePagination,
  AdminTableSkeleton,
  AdminTableToolbar,
} from "./data-table/admin-table-toolbar";

const CATEGORY_FILTER_OPTIONS = HELP_CATEGORIES.map((cat) => ({
  value: cat.id,
  label: cat.label,
}));

const AUDIENCE_FILTER_OPTIONS = HELP_AUDIENCES.map((audience) => ({
  value: audience,
  label: HELP_AUDIENCE_LABELS[audience],
}));

const COLUMN_DEFS = [
  { id: "articleNumber", label: "ID", sortable: true, minWidth: 88 },
  { id: "published", label: "Published", sortable: true, minWidth: 88 },
  { id: "visibility", label: "Visibility", sortable: true, minWidth: 104 },
  {
    id: "title",
    label: "Title",
    sortable: true,
    filterable: true,
    filterType: "text" as const,
    textMatchModes: CONTAINS_TEXT_FILTER_MODES,
    minWidth: 140,
  },
  {
    id: "article",
    label: "Article",
    sortable: false,
    filterable: true,
    filterType: "text" as const,
    textMatchModes: CONTAINS_TEXT_FILTER_MODES,
    minWidth: 220,
  },
  {
    id: "category",
    label: "Category",
    sortable: true,
    filterable: true,
    filterType: "enum" as const,
    minWidth: 120,
  },
  {
    id: "keywords",
    label: "Keywords",
    sortable: false,
    filterable: true,
    filterType: "text" as const,
    minWidth: 160,
  },
  {
    id: "audience",
    label: "Audience",
    sortable: true,
    filterable: true,
    filterType: "enum" as const,
    minWidth: 104,
  },
  {
    id: "slug",
    label: "Slug",
    sortable: true,
    filterable: true,
    filterType: "text" as const,
    minWidth: 140,
  },
  { id: "featured", label: "Featured", sortable: false, minWidth: 72 },
  { id: "popular", label: "Popular", sortable: false, minWidth: 72 },
  { id: "lastReviewedAt", label: "Reviewed", sortable: true, minWidth: 96 },
  { id: "updatedAt", label: "Updated", sortable: true, minWidth: 96 },
] as const;

function columnEnumOptions(
  col: (typeof COLUMN_DEFS)[number],
): { value: string; label: string }[] | undefined {
  if (col.id === "category") return CATEGORY_FILTER_OPTIONS;
  if (col.id === "audience") return AUDIENCE_FILTER_OPTIONS;
  return undefined;
}

function columnTextMatchModes(
  col: (typeof COLUMN_DEFS)[number],
): readonly TextFilterMode[] | undefined {
  if (!("filterable" in col) || !col.filterable) return undefined;
  if ("textMatchModes" in col && col.textMatchModes) return col.textMatchModes;
  return TEXT_FILTER_MODES;
}

const CHECKBOX_COLUMN_WIDTH = 40;
const ACTIONS_COLUMN_WIDTH = 160;

const COLUMN_MIN_WIDTHS = Object.fromEntries(
  COLUMN_DEFS.map((col) => [col.id, col.minWidth]),
) as Record<string, number>;

function columnStyle(width: number): CSSProperties {
  return { width, minWidth: width, maxWidth: width };
}

function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function cellClass(): string {
  return "overflow-hidden px-3 py-2";
}

function KnowledgeRepositoryTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  } = useAdminTableFetch<KnowledgeArticle>(
    "/api/admin/knowledge-articles",
    "articles",
    knowledgeArticlesAdminTableConfig,
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const columns = useAdminTableColumns(
    "knowledge-articles",
    [...COLUMN_DEFS.map((col) => col.id), "actions"],
    { minWidth: { ...COLUMN_MIN_WIDTHS, actions: ACTIONS_COLUMN_WIDTH } },
  );
  const pageIds = useMemo(() => rows.map((row) => row.id), [rows]);

  function sortDirFor(columnId: string): AdminSortDir | null {
    return params.sort === columnId ? params.sortDir : null;
  }
  const allSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;
  const selectedSingleRow = useMemo(() => {
    if (selected.size !== 1) return null;
    const id = [...selected][0];
    return rows.find((row) => row.id === id) ?? null;
  }, [selected, rows]);

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
          <AdminKnowledgeImportDialog
            disabled={busy}
            onImported={() => {
              void refetch();
              router.refresh();
            }}
          />
          <a href={exportUrl(false)}>
            <Button type="button" variant="outline" size="sm" disabled={busy || loading}>
              Export Knowledge Articles
            </Button>
          </a>
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
        columnOptions={COLUMN_DEFS.map((col) => ({
          id: col.id,
          label: col.label,
          visible: columns.isVisible(col.id),
          onToggle: (visible) => columns.toggleColumn(col.id, visible),
        }))}
      />

      <div className="flex flex-wrap gap-2">
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
          {selectedSingleRow ? (
            <>
              <Link href={`/admin/knowledge/${selectedSingleRow.id}/edit`}>
                <Button type="button" size="sm" variant="outline" disabled={busy}>
                  Edit
                </Button>
              </Link>
              <a
                href={`/help/${selectedSingleRow.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button type="button" size="sm" variant="outline" disabled={busy}>
                  Preview
                </Button>
              </a>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void duplicateArticle(selectedSingleRow.id)}
              >
                Duplicate
              </Button>
            </>
          ) : null}
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
              Export Knowledge Articles
            </Button>
          </a>
        </div>
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

      {!loading && rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No knowledge articles yet. Use <strong>Import Knowledge Articles</strong> to
          load an Excel file, or create a new article.
        </p>
      ) : (
        <div className="w-full max-w-full overflow-x-auto rounded-lg border">
          <table
            className="w-full text-left text-sm"
            style={{ tableLayout: "fixed", minWidth: "100%" }}
          >
            <colgroup>
              <col style={columnStyle(CHECKBOX_COLUMN_WIDTH)} />
              {COLUMN_DEFS.filter((col) => columns.isVisible(col.id)).map((col) => (
                <col key={col.id} style={columnStyle(columns.columnWidth(col.id))} />
              ))}
              <col style={columnStyle(columns.columnWidth("actions"))} />
            </colgroup>
            <thead className="border-b bg-muted/40 text-xs">
              <tr>
                <th
                  className="px-2 py-2"
                  style={columnStyle(CHECKBOX_COLUMN_WIDTH)}
                >
                  <input
                    type="checkbox"
                    checked={allSelected}
                    aria-label="Select all visible rows"
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
                {COLUMN_DEFS.filter((col) => columns.isVisible(col.id)).map((col) => (
                  <AdminTableHeaderCell
                    key={col.id}
                    label={col.label}
                    columnId={col.id}
                    sortable={col.sortable}
                    filterable={"filterable" in col ? col.filterable : false}
                    filterType={"filterType" in col ? col.filterType : "text"}
                    enumOptions={columnEnumOptions(col)}
                    textMatchModes={columnTextMatchModes(col)}
                    activeSortDir={sortDirFor(col.id)}
                    filterValue={params.filters[col.id]}
                    width={columns.columnWidth(col.id)}
                    onResizeStart={(e) => columns.beginColumnResize(col.id, e.clientX)}
                    onHide={() => columns.hideColumn(col.id)}
                    onSort={(dir) => setSort(col.id, dir)}
                    onFilter={(value) => setFilter(col.id, value || null)}
                    onClearFilter={() => setFilter(col.id, null)}
                  />
                ))}
                <th
                  className="relative px-2 py-2"
                  style={columnStyle(columns.columnWidth("actions"))}
                  aria-label="Actions"
                >
                  <span className="sr-only">Actions</span>
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
            {loading ? (
              <AdminTableSkeleton
                cols={
                  COLUMN_DEFS.filter((col) => columns.isVisible(col.id)).length + 2
                }
                rows={6}
              />
            ) : (
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className={cellClass()}>
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        aria-label={`Select ${row.title}`}
                        onChange={(e) => toggleOne(row.id, e.target.checked)}
                      />
                    </td>
                    {columns.isVisible("articleNumber") && (
                      <td className={`${cellClass()} truncate font-mono text-xs tabular-nums`}>
                        {formatKnowledgeArticleNumber(row.articleNumber)}
                      </td>
                    )}
                    {columns.isVisible("published") && (
                      <td className={cellClass()}>
                        <Badge variant={row.published ? "default" : "secondary"}>
                          {row.published ? "Yes" : "No"}
                        </Badge>
                      </td>
                    )}
                    {columns.isVisible("visibility") && (
                      <td className={cellClass()}>
                        <Badge variant="outline">{row.visibility}</Badge>
                      </td>
                    )}
                    {columns.isVisible("title") && (
                      <td className={`${cellClass()} truncate font-medium`}>
                        {row.title}
                      </td>
                    )}
                    {columns.isVisible("article") && (
                      <td className={cellClass()}>
                        <ArticlePreviewCell row={row} />
                      </td>
                    )}
                    {columns.isVisible("category") && (
                      <td className={`${cellClass()} truncate text-xs`}>
                        {getHelpCategoryLabel(row.category as never)}
                      </td>
                    )}
                    {columns.isVisible("keywords") && (
                      <td
                        className={`${cellClass()} truncate text-xs text-muted-foreground`}
                        title={row.keywords.join(", ")}
                      >
                        {row.keywords.length > 0 ? row.keywords.join(", ") : "—"}
                      </td>
                    )}
                    {columns.isVisible("audience") && (
                      <td className={`${cellClass()} truncate text-xs`}>
                        {HELP_AUDIENCE_LABELS[row.audience as keyof typeof HELP_AUDIENCE_LABELS] ?? row.audience}
                      </td>
                    )}
                    {columns.isVisible("slug") && (
                      <td className={`${cellClass()} truncate font-mono text-xs`}>
                        {row.slug}
                      </td>
                    )}
                    {columns.isVisible("featured") && (
                      <td className={cellClass()}>{row.featured ? "Yes" : "—"}</td>
                    )}
                    {columns.isVisible("popular") && (
                      <td className={cellClass()}>{row.popular ? "Yes" : "—"}</td>
                    )}
                    {columns.isVisible("lastReviewedAt") && (
                      <td className={`${cellClass()} truncate text-xs`}>
                        {formatDate(row.lastReviewedAt)}
                      </td>
                    )}
                    {columns.isVisible("updatedAt") && (
                      <td className={`${cellClass()} truncate text-xs`}>
                        {formatDate(row.updatedAt)}
                      </td>
                    )}
                    <td className={cellClass()}>
                      <KnowledgeArticleActions
                        row={row}
                        busy={busy}
                        onDuplicate={() => void duplicateArticle(row.id)}
                        onTogglePublish={() => void togglePublish(row)}
                        onArchive={() => void archiveArticle(row.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
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

function KnowledgeArticleActions({
  row,
  busy,
  onDuplicate,
  onTogglePublish,
  onArchive,
}: {
  row: KnowledgeArticle;
  busy: boolean;
  onDuplicate: () => void;
  onTogglePublish: () => void;
  onArchive: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <Link
        href={`/admin/knowledge/${row.id}/edit`}
        title="Edit article"
        aria-label={`Edit ${row.title}`}
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-7")}
      >
        <Pencil className="size-3.5" />
      </Link>
      <a
        href={`/help/${row.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Preview on Help Center"
        aria-label={`Preview ${row.title} on Help Center`}
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-7")}
      >
        <ExternalLink className="size-3.5" />
      </a>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={busy}
        title="Duplicate article"
        aria-label={`Duplicate ${row.title}`}
        onClick={onDuplicate}
      >
        <Copy className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={busy}
        title={row.published ? "Unpublish article" : "Publish article"}
        aria-label={
          row.published ? `Unpublish ${row.title}` : `Publish ${row.title}`
        }
        onClick={onTogglePublish}
      >
        {row.published ? (
          <CircleX className="size-3.5" />
        ) : (
          <CheckCircle2 className="size-3.5" />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 text-destructive hover:bg-destructive/10"
        disabled={busy}
        title="Archive article"
        aria-label={`Archive ${row.title}`}
        onClick={onArchive}
      >
        <Archive className="size-3.5" />
      </Button>
    </div>
  );
}

function ArticlePreviewCell({ row }: { row: KnowledgeArticle }) {
  return (
    <div className="group relative">
      <p className="cursor-help truncate text-xs text-muted-foreground">
        {row.shortDescription}
      </p>
      <div className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-80 rounded-md border bg-background p-3 text-xs shadow-lg group-hover:block">
        <p className="font-medium text-foreground">{row.title}</p>
        <p className="mt-2 text-muted-foreground">{row.shortDescription}</p>
        {row.chatbotSummary ? (
          <p className="mt-2 line-clamp-6 text-muted-foreground">
            {row.chatbotSummary}
          </p>
        ) : null}
        {row.articleBody ? (
          <p className="mt-2 line-clamp-4 text-muted-foreground">{row.articleBody}</p>
        ) : null}
      </div>
    </div>
  );
}

function KnowledgeTableSkeleton() {
  return (
    <div className="w-full max-w-full overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm" style={{ tableLayout: "fixed" }}>
        <AdminTableSkeleton cols={COLUMN_DEFS.length + 2} rows={6} />
      </table>
    </div>
  );
}

export function AdminKnowledgeRepositorySection() {
  return (
    <Suspense fallback={<KnowledgeTableSkeleton />}>
      <KnowledgeRepositoryTable />
    </Suspense>
  );
}

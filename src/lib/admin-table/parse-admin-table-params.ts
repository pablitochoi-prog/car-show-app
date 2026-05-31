import type {
  AdminSortDir,
  AdminTableConfig,
  ParsedAdminTableParams,
} from "./types";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function paramKey(prefix: string, suffix: string): string {
  return `${prefix}_${suffix}`;
}

function filterKey(prefix: string, columnId: string): string {
  return `${prefix}_f.${columnId}`;
}

export function parseAdminTableParams(
  searchParams: URLSearchParams,
  config: AdminTableConfig,
): ParsedAdminTableParams {
  const { prefix } = config;
  const sortableIds = new Set(
    config.columns.filter((c) => c.sortable).map((c) => c.id),
  );
  const filterableIds = new Set(
    config.columns.filter((c) => c.filterable).map((c) => c.id),
  );

  const rawSort = searchParams.get(paramKey(prefix, "sort"))?.trim();
  const sort =
    rawSort && sortableIds.has(rawSort) ? rawSort : config.defaultSort;

  const rawDir = searchParams.get(paramKey(prefix, "sortDir"))?.trim();
  const sortDir: AdminSortDir =
    rawDir === "asc" || rawDir === "desc" ? rawDir : config.defaultSortDir;

  const rawPage = Number.parseInt(
    searchParams.get(paramKey(prefix, "page")) ?? "1",
    10,
  );
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const rawPageSize = Number.parseInt(
    searchParams.get(paramKey(prefix, "pageSize")) ??
      String(config.defaultPageSize ?? DEFAULT_PAGE_SIZE),
    10,
  );
  const maxSize = config.maxPageSize ?? MAX_PAGE_SIZE;
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(rawPageSize, maxSize)
      : (config.defaultPageSize ?? DEFAULT_PAGE_SIZE);

  const q = searchParams.get(paramKey(prefix, "q"))?.trim() ?? "";

  const filters: Record<string, string> = {};
  for (const col of config.columns) {
    if (!col.filterable) continue;
    const value = searchParams.get(filterKey(prefix, col.id))?.trim();
    if (value) filters[col.id] = value;
  }
  // date range companion keys (startDateFrom / startDateTo)
  for (const [key, value] of searchParams.entries()) {
    const prefixFilter = `${prefix}_f.`;
    if (!key.startsWith(prefixFilter)) continue;
    const columnId = key.slice(prefixFilter.length);
    if (filterableIds.has(columnId)) continue;
    const trimmed = value.trim();
    if (trimmed) filters[columnId] = trimmed;
  }

  return { sort, sortDir, page, pageSize, q, filters };
}

export type AdminTableSearchParamsPatch = {
  sort?: string;
  sortDir?: AdminSortDir;
  page?: number;
  pageSize?: number;
  q?: string;
  filters?: Record<string, string | null | undefined>;
};

export function buildAdminTableSearchParams(
  prefix: string,
  params: AdminTableSearchParamsPatch,
  existing?: URLSearchParams,
): URLSearchParams {
  const sp = new URLSearchParams(existing?.toString());

  if (params.sort !== undefined) {
    sp.set(paramKey(prefix, "sort"), params.sort);
  }
  if (params.sortDir !== undefined) {
    sp.set(paramKey(prefix, "sortDir"), params.sortDir);
  }
  if (params.page !== undefined) {
    sp.set(paramKey(prefix, "page"), String(params.page));
  }
  if (params.pageSize !== undefined) {
    sp.set(paramKey(prefix, "pageSize"), String(params.pageSize));
  }
  if (params.q !== undefined) {
    const v = params.q.trim();
    if (v) sp.set(paramKey(prefix, "q"), v);
    else sp.delete(paramKey(prefix, "q"));
  }
  if (params.filters) {
    for (const [columnId, value] of Object.entries(params.filters)) {
      const key = filterKey(prefix, columnId);
      const v = value?.trim();
      if (v) sp.set(key, v);
      else sp.delete(key);
    }
  }

  return sp;
}

export function countActiveFilters(params: ParsedAdminTableParams): number {
  let n = params.q ? 1 : 0;
  n += Object.keys(params.filters).length;
  return n;
}

export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AdminTableConfig, AdminSortDir, ParsedAdminTableParams } from "@/lib/admin-table/types";
import {
  buildAdminTableSearchParams,
  countActiveFilters,
  parseAdminTableParams,
  type AdminTableSearchParamsPatch,
} from "@/lib/admin-table/parse-admin-table-params";

const DEBOUNCE_MS = 300;

export function useAdminTableQuery(config: AdminTableConfig) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prefix = config.prefix;

  const params = useMemo(
    () => parseAdminTableParams(searchParams, config),
    [searchParams, config],
  );

  const replaceParams = useCallback(
    (patch: AdminTableSearchParamsPatch) => {
      const next = buildAdminTableSearchParams(prefix, patch, searchParams);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, prefix, router, searchParams],
  );

  const [qInput, setQInput] = useState(params.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQInput(params.q);
  }, [params.q]);

  useEffect(() => {
    if (qInput === params.q) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      replaceParams({ q: qInput, page: 1 });
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [qInput, params.q, replaceParams]);

  const setSort = useCallback(
    (columnId: string, dir: AdminSortDir) => {
      replaceParams({ sort: columnId, sortDir: dir });
    },
    [replaceParams],
  );

  const setFilter = useCallback(
    (columnId: string, value: string | null) => {
      replaceParams({
        page: 1,
        filters: { [columnId]: value },
      });
    },
    [replaceParams],
  );

  const setFilters = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      replaceParams({ page: 1, filters: updates });
    },
    [replaceParams],
  );

  const setPage = useCallback(
    (page: number) => {
      replaceParams({ page });
    },
    [replaceParams],
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      replaceParams({ page: 1, pageSize });
    },
    [replaceParams],
  );

  const clearAllFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete(`${prefix}_q`);
    for (const key of [...next.keys()]) {
      if (key.startsWith(`${prefix}_f.`)) next.delete(key);
    }
    next.set(`${prefix}_page`, "1");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    setQInput("");
  }, [pathname, prefix, router, searchParams]);

  const activeFilterCount = countActiveFilters(params);

  return {
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
  };
}

export type { ParsedAdminTableParams };

"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { AdminTableConfig } from "@/lib/admin-table/types";
import type { AdminTableMeta } from "@/lib/admin-table/types";
import { useAdminTableQuery } from "./use-admin-table-query";

export function useAdminTableFetch<T>(
  apiUrl: string,
  dataKey: string,
  config: AdminTableConfig,
) {
  const searchParams = useSearchParams();
  const tableQuery = useAdminTableQuery(config);
  const [rows, setRows] = useState<T[]>([]);
  const [meta, setMeta] = useState<AdminTableMeta>({
    total: 0,
    page: 1,
    pageSize: config.defaultPageSize,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = searchParams.toString();
      const url = qs ? `${apiUrl}?${qs}` : apiUrl;
      const res = await fetch(url, { credentials: "same-origin" });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load data");
        return;
      }
      setRows((data[dataKey] ?? []) as T[]);
      if (data.meta && typeof data.meta === "object") {
        setMeta(data.meta as AdminTableMeta);
      }
    } catch {
      setError("Could not load data. Check your connection and try again.");
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [apiUrl, dataKey, searchParams]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  return {
    ...tableQuery,
    rows,
    setRows,
    meta,
    loading,
    error,
    loaded,
    refetch: fetchRows,
  };
}

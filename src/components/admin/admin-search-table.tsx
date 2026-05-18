"use client";

import { useState, useCallback, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function useAdminSearch<T>(
  apiUrl: string,
  dataKey: string,
  initialRows: T[] = [],
) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<T[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(initialRows.length > 0);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (overrideQuery?: string) => {
      const term = (overrideQuery !== undefined ? overrideQuery : query).trim();
      setLoading(true);
      setError(null);
      try {
        const url = term
          ? `${apiUrl}?q=${encodeURIComponent(term)}`
          : apiUrl;
        const res = await fetch(url, { credentials: "same-origin" });
        const data = (await res.json()) as Record<string, unknown>;
        if (res.ok) {
          setRows((data[dataKey] ?? []) as T[]);
        } else {
          const message =
            typeof data.error === "string"
              ? data.error
              : `Could not load data (${res.status})`;
          setError(message);
        }
      } catch {
        setError("Could not load data. Check your connection and try again.");
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    },
    [apiUrl, dataKey, query],
  );

  useEffect(() => {
    void search();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { query, setQuery, rows, setRows, loading, loaded, error, search };
}

export function AdminSearchBar({
  query,
  onQueryChange,
  onSearch,
  loading,
  placeholder = "Search…",
}: {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: () => void;
  loading: boolean;
  placeholder?: string;
}) {
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
    >
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="pl-8 text-sm"
          disabled={loading}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "Loading…" : "Search"}
      </button>
    </form>
  );
}

export function AdminEmptyState({
  message,
  error,
}: {
  message: string;
  error?: string | null;
}) {
  return (
    <div className="py-8 text-center text-sm">
      {error ? (
        <p className="text-destructive">{error}</p>
      ) : (
        <p className="text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

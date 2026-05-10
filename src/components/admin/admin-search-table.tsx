"use client";

import { useState, useCallback, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function useAdminSearch<T>(
  apiUrl: string,
  dataKey: string,
) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const search = useCallback(
    async (q?: string) => {
      const term = q ?? query;
      setLoading(true);
      try {
        const url = term
          ? `${apiUrl}?q=${encodeURIComponent(term)}`
          : apiUrl;
        const res = await fetch(url, { credentials: "same-origin" });
        if (res.ok) {
          const data = await res.json();
          setRows((data[dataKey] ?? []) as T[]);
        }
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    },
    [apiUrl, dataKey, query],
  );

  useEffect(() => {
    void search("");
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return { query, setQuery, rows, setRows, loading, loaded, search };
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

export function AdminEmptyState({ message }: { message: string }) {
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">{message}</p>
  );
}

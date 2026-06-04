"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  JudgeBallotResultsTable,
  type JudgeBallotResultRow,
} from "@/components/organizer/awards-judging/judge-ballot-results-table";

type BallotCategory = {
  id: string;
  name: string;
  status: "DRAFT" | "OPEN" | "CLOSED" | "FINALIZED";
  _count: { votes: number };
};

const STATUS_LABELS: Record<BallotCategory["status"], string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  CLOSED: "Closed",
  FINALIZED: "Finalized",
};

export function JudgeBallotResultsAdmin({ eventId }: { eventId: string }) {
  const [categories, setCategories] = useState<BallotCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [results, setResults] = useState<JudgeBallotResultRow[]>([]);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/judge-ballot/categories`, {
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        categories?: BallotCategory[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load categories.");
      setCategories(data.categories ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  async function toggleResults(catId: string) {
    if (openId === catId) {
      setOpenId(null);
      setResults([]);
      return;
    }
    setOpenId(catId);
    setResultsLoading(true);
    setResults([]);
    try {
      const res = await fetch(
        `/api/events/${eventId}/judge-ballot/results?categoryId=${encodeURIComponent(catId)}`,
        { credentials: "same-origin" },
      );
      const data = (await res.json()) as {
        results?: JudgeBallotResultRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load results.");
      setResults(data.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load results.");
    } finally {
      setResultsLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        Loading ballot categories…
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No judge ballot award categories yet. Configure categories under Judge
        Ballot Voting setup.
      </p>
    );
  }

  const withVotes = categories.filter((c) => c._count.votes > 0);

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        Ranked vehicles by total judge votes per award category. Expand a category
        to view results.
      </p>
      {withVotes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No ballot votes recorded yet.
        </p>
      ) : null}
      <div className="space-y-3">
        {categories.map((cat) => (
          <Card key={cat.id}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{cat.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{STATUS_LABELS[cat.status]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {cat._count.votes} vote row{cat._count.votes === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={cat._count.votes === 0}
                onClick={() => void toggleResults(cat.id)}
              >
                {openId === cat.id ? (
                  <ChevronUp className="mr-1 size-4" aria-hidden />
                ) : (
                  <ChevronDown className="mr-1 size-4" aria-hidden />
                )}
                {openId === cat.id ? "Hide results" : "View results"}
              </Button>
              {openId === cat.id ? (
                <div className="mt-4">
                  {resultsLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Loading…
                    </div>
                  ) : (
                    <JudgeBallotResultsTable rows={results} />
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

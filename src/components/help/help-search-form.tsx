import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HELP_CATEGORIES } from "@/lib/help/help-categories";
import {
  HELP_AUDIENCE_LABELS,
  HELP_AUDIENCES,
  type HelpAudience,
  type HelpCategory,
} from "@/lib/help/help-types";
import { cn } from "@/lib/utils";

type Props = {
  q?: string;
  audience?: HelpAudience;
  category?: HelpCategory;
  resultCount?: number;
};

function buildHelpHref(params: {
  q?: string;
  audience?: HelpAudience;
  category?: HelpCategory;
}): string {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.audience) search.set("audience", params.audience);
  if (params.category) search.set("category", params.category);
  const qs = search.toString();
  return qs ? `/help?${qs}` : "/help";
}

export function HelpSearchForm({ q, audience, category, resultCount }: Props) {
  const hasFilters = Boolean(q?.trim() || audience || category);

  return (
    <div className="space-y-4">
      <form method="get" className="space-y-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Label htmlFor="help-search" className="sr-only">
            Search help articles
          </Label>
          <Input
            id="help-search"
            name="q"
            placeholder="Search help articles…"
            defaultValue={q}
            className="h-11 pl-10"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="help-audience">Audience</Label>
            <select
              id="help-audience"
              name="audience"
              defaultValue={audience ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All audiences</option>
              {HELP_AUDIENCES.filter((a) => a !== "ADMIN").map((value) => (
                <option key={value} value={value}>
                  {HELP_AUDIENCE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="help-category">Category</Label>
            <select
              id="help-category"
              name="category"
              defaultValue={category ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All categories</option>
              {HELP_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit">Search</Button>
          {hasFilters ? (
            <Link
              href="/help"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Clear filters
            </Link>
          ) : null}
        </div>
      </form>

      <div className="flex flex-wrap gap-2" aria-label="Quick audience filters">
        <span className="w-full text-xs font-medium text-muted-foreground sm:w-auto sm:py-1">
          Quick filters:
        </span>
        {(["REGISTRANT", "ORGANIZER", "SPECTATOR", "JUDGE"] as const).map(
          (value) => (
            <Link
              key={value}
              href={buildHelpHref({ q, audience: value, category })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                audience === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {HELP_AUDIENCE_LABELS[value]}
            </Link>
          ),
        )}
      </div>

      {typeof resultCount === "number" && hasFilters ? (
        <p className="text-sm text-muted-foreground" role="status">
          {resultCount} article{resultCount === 1 ? "" : "s"} found
        </p>
      ) : null}
    </div>
  );
}

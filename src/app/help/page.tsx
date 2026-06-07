import type { Metadata } from "next";
import Link from "next/link";
import { HelpArticleCard } from "@/components/help/help-article-card";
import { HelpSearchForm } from "@/components/help/help-search-form";
import {
  getFeaturedHelpArticles,
  getPopularHelpArticlesByAudience,
  queryHelpArticles,
} from "@/lib/help/help-registry";
import {
  isHelpAudience,
  isHelpCategory,
  type HelpAudience,
  type HelpCategory,
} from "@/lib/help/help-types";

export const metadata: Metadata = {
  title: "Help Center",
  description:
    "CarShowScout help articles for registrants, organizers, judges, and spectators.",
};

type PageProps = {
  searchParams: Promise<{
    q?: string;
    audience?: string;
    category?: string;
  }>;
};

export default async function HelpCenterPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q?.trim();
  const audienceParam = params.audience ?? "";
  const categoryParam = params.category ?? "";
  const audience: HelpAudience | undefined = isHelpAudience(audienceParam)
    ? audienceParam
    : undefined;
  const category: HelpCategory | undefined = isHelpCategory(categoryParam)
    ? categoryParam
    : undefined;

  const hasActiveFilters = Boolean(q || audience || category);
  const results = queryHelpArticles({ query: q, audience, category });
  const featured = getFeaturedHelpArticles(4);
  const popularOrganizer = getPopularHelpArticlesByAudience("ORGANIZER", 4);
  const popularRegistrant = getPopularHelpArticlesByAudience("REGISTRANT", 4);

  return (
    <div className="page-shell max-w-4xl py-10 md:py-14">
      <p className="text-sm text-muted-foreground">
        <Link
          href="/"
          className="hover:text-foreground underline-offset-4 hover:underline"
        >
          ← Home
        </Link>
      </p>

      <div className="page-head mt-4 text-left">
        <h1 className="text-3xl font-bold tracking-tight">Help Center</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Guides for registering for shows, running events, judging, and public
          voting on CarShowScout.
        </p>
      </div>

      <div className="mt-8">
        <HelpSearchForm
          q={q}
          audience={audience}
          category={category}
          resultCount={hasActiveFilters ? results.length : undefined}
        />
      </div>

      {hasActiveFilters ? (
        <section className="mt-10 space-y-4" aria-labelledby="results-heading">
          <h2 id="results-heading" className="text-xl font-semibold">
            Search results
          </h2>
          {results.length === 0 ? (
            <p className="text-muted-foreground">
              No articles matched your search. Try different keywords or clear
              filters.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((article) => (
                <HelpArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="mt-10 space-y-10">
          <section className="space-y-4" aria-labelledby="featured-heading">
            <h2 id="featured-heading" className="text-xl font-semibold">
              Featured articles
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {featured.map((article) => (
                <HelpArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>

          <section className="space-y-4" aria-labelledby="organizer-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="organizer-heading" className="text-xl font-semibold">
                Popular for organizers
              </h2>
              <Link
                href="/help?audience=ORGANIZER"
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                View all organizer articles
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {popularOrganizer.map((article) => (
                <HelpArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>

          <section className="space-y-4" aria-labelledby="registrant-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="registrant-heading" className="text-xl font-semibold">
                Popular for registrants
              </h2>
              <Link
                href="/help?audience=REGISTRANT"
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                View all registrant articles
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {popularRegistrant.map((article) => (
                <HelpArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

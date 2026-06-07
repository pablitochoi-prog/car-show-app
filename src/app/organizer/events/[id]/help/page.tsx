import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { requireStaffStepUpPage } from "@/lib/require-organizer-step-up";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { EventOrganizerNavBar } from "@/components/organizer/event-organizer-nav-bar";
import { HelpArticleCard } from "@/components/help/help-article-card";
import { HelpSearchForm } from "@/components/help/help-search-form";
import { HELP_CATEGORIES } from "@/lib/help/help-categories";
import {
  queryHelpArticlesAsync,
  type HelpArticleFilters,
} from "@/lib/help/help-registry";
import {
  isHelpCategory,
  type HelpArticle,
  type HelpCategory,
} from "@/lib/help/help-types";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    q?: string;
    category?: string;
  }>;
};

function groupByCategory(articles: HelpArticle[]) {
  const grouped = new Map<HelpCategory, typeof articles>();
  for (const article of articles) {
    const list = grouped.get(article.category) ?? [];
    list.push(article);
    grouped.set(article.category, list);
  }
  return HELP_CATEGORIES.filter((cat) => grouped.has(cat.id)).map((cat) => ({
    category: cat.id,
    label: cat.label,
    description: cat.description,
    articles: grouped.get(cat.id)!,
  }));
}

export default async function OrganizerEventHelpPage({
  params,
  searchParams,
}: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id: eventId } = await params;
  const sp = await searchParams;

  await requireStaffStepUpPage({
    user,
    pathname: `/organizer/events/${eventId}/help`,
    search:
      sp.q || sp.category
        ? `?${new URLSearchParams({
            ...(sp.q ? { q: sp.q } : {}),
            ...(sp.category ? { category: sp.category } : {}),
          }).toString()}`
        : undefined,
  });

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, showNumber: true, orgId: true },
  });
  if (!event) notFound();

  const allowed = await canManageEvent(
    user.id,
    eventId,
    event.orgId,
    user.platformRole,
  );
  if (!allowed) notFound();

  const q = sp.q?.trim();
  const categoryParam = sp.category ?? "";
  const category = isHelpCategory(categoryParam) ? categoryParam : undefined;
  const filters: HelpArticleFilters = {
    audience: "ORGANIZER",
    query: q,
    category,
  };
  const articles = await queryHelpArticlesAsync(filters);
  const hasActiveFilters = Boolean(q || category);
  const grouped = groupByCategory(articles);
  const helpBasePath = `/organizer/events/${eventId}/help`;

  return (
    <div className="page-shell max-w-4xl space-y-6">
      <div className="space-y-4">
        <Link
          href={`/organizer/events/${eventId}/edit`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to event setup
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            Help guides —{" "}
            <EventNameWithNumber
              name={event.name}
              showNumber={event.showNumber}
            />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organizer and troubleshooting articles for running this show.
          </p>
        </div>
      </div>

      <EventOrganizerNavBar eventId={eventId} active="edit" user={user} />

      <HelpSearchForm
        q={q}
        category={category}
        resultCount={hasActiveFilters ? articles.length : undefined}
        basePath={helpBasePath}
        lockAudience="ORGANIZER"
        showQuickFilters={false}
      />

      {hasActiveFilters ? (
        <section className="space-y-4" aria-labelledby="help-results-heading">
          <h2 id="help-results-heading" className="text-lg font-semibold">
            Search results
          </h2>
          {articles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No articles match your search. Try different keywords or browse all
              guides below.
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {articles.map((article) => (
                <li key={article.id}>
                  <HelpArticleCard article={article} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <div className="space-y-8">
          {grouped.map(
            ({
              category: catId,
              label,
              description,
              articles: sectionArticles,
            }) => (
            <section key={catId} aria-labelledby={`help-cat-${catId}`}>
              <h2
                id={`help-cat-${catId}`}
                className="text-lg font-semibold"
              >
                {label}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {sectionArticles.map((article) => (
                  <li key={article.id}>
                    <HelpArticleCard article={article} />
                  </li>
                ))}
              </ul>
            </section>
          ),
          )}
        </div>
      )}

      <p className="border-t border-border pt-6 text-sm text-muted-foreground">
        Need registrant, judge, or spectator guides? Visit the{" "}
        <Link
          href="/help"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          full Help Center
        </Link>
        .
      </p>
    </div>
  );
}

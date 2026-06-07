import Link from "next/link";
import { getHelpCategoryLabel } from "@/lib/help/help-categories";
import { formatHelpArticleReviewDate } from "@/lib/help/help-registry";
import type { HelpArticle } from "@/lib/help/help-types";
import { HelpAudienceBadge } from "./help-audience-badge";
import { HelpRichTextContent } from "./help-rich-text-content";

type Props = {
  article: HelpArticle;
  relatedArticles?: HelpArticle[];
};

export function HelpArticleBody({ article, relatedArticles = [] }: Props) {
  const related = relatedArticles;

  return (
    <article className="space-y-8 text-base leading-relaxed">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <HelpAudienceBadge audience={article.audience} />
          <span className="text-sm text-muted-foreground">
            {getHelpCategoryLabel(article.category)}
          </span>
        </div>
        <p className="text-muted-foreground">{article.shortDescription}</p>
      </header>

      {article.articleBody ? (
        <p className="text-muted-foreground">{article.articleBody}</p>
      ) : null}

      <section aria-labelledby="who-heading">
        <h2 id="who-heading" className="text-xl font-semibold">
          Who this article is for
        </h2>
        <p className="mt-3 text-muted-foreground">{article.whoThisIsFor}</p>
      </section>

      <section aria-labelledby="what-heading">
        <h2 id="what-heading" className="text-xl font-semibold">
          What this helps you do
        </h2>
        <p className="mt-3 text-muted-foreground">{article.whatThisHelpsYouDo}</p>
      </section>

      {article.beforeYouStart.length > 0 ? (
        <section aria-labelledby="before-heading">
          <h2 id="before-heading" className="text-xl font-semibold">
            Before you start
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
            {article.beforeYouStart.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="steps-heading">
        <h2 id="steps-heading" className="text-xl font-semibold">
          Step-by-step instructions
        </h2>
        <ol className="mt-4 space-y-5">
          {article.stepByStepInstructions.map((step, index) => (
            <li key={step.title} className="space-y-1">
              <h3 className="font-medium text-foreground">
                {index + 1}. {step.title}
              </h3>
              <HelpRichTextContent html={step.body} className="mt-1" />
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="next-heading">
        <h2 id="next-heading" className="text-xl font-semibold">
          What happens next
        </h2>
        <p className="mt-3 text-muted-foreground">{article.whatHappensNext}</p>
      </section>

      {article.frequentlyAskedQuestions.length > 0 ? (
        <section aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-xl font-semibold">
            Common questions
          </h2>
          <dl className="mt-4 space-y-4">
            {article.frequentlyAskedQuestions.map((faq) => (
              <div key={faq.question}>
                <dt className="font-medium text-foreground">{faq.question}</dt>
                <dd className="mt-1">
                  <HelpRichTextContent html={faq.answer} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {article.relatedWebsitePages.length > 0 ? (
        <section aria-labelledby="pages-heading">
          <h2 id="pages-heading" className="text-xl font-semibold">
            Related pages
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-muted-foreground">
            {article.relatedWebsitePages.map((page) => (
              <li key={page}>
                <code className="rounded bg-muted px-1 py-0.5 text-xs">{page}</code>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section aria-labelledby="related-heading">
          <h2 id="related-heading" className="text-xl font-semibold">
            Related articles
          </h2>
          <ul className="mt-3 space-y-2">
            {related.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/help/${item.slug}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {article.keywords.length > 0 ? (
        <section aria-labelledby="keywords-heading">
          <h2 id="keywords-heading" className="sr-only">
            Keywords
          </h2>
          <p className="text-xs text-muted-foreground">
            Keywords: {article.keywords.join(", ")}
          </p>
        </section>
      ) : null}

      <footer className="border-t pt-6 text-sm text-muted-foreground">
        Last reviewed {formatHelpArticleReviewDate(article.lastReviewedAt)}
      </footer>
    </article>
  );
}

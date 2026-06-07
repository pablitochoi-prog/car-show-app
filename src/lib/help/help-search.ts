import type { HelpArticle } from "./help-types";

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function tokenize(query: string): string[] {
  return normalizeQuery(query)
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

function searchableText(article: HelpArticle): string {
  return [
    article.title,
    article.shortDescription,
    article.category,
    article.audience,
    article.keywords.join(" "),
    article.chatbotKeywords.join(" "),
    article.chatbotSummary,
    article.articleBody,
    article.whoThisIsFor,
    article.whatThisHelpsYouDo,
    article.stepByStepInstructions.map((s) => `${s.title} ${s.body}`).join(" "),
    article.frequentlyAskedQuestions
      .map((f) => `${f.question} ${f.answer}`)
      .join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

export type HelpSearchScore = {
  article: HelpArticle;
  score: number;
};

/**
 * Basic relevance search across title, description, category, keywords, body, and chatbot fields.
 * Empty query returns all articles with score 0 (caller should sort separately).
 */
export function scoreHelpArticles(
  articles: HelpArticle[],
  query: string,
): HelpSearchScore[] {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return articles.map((article) => ({ article, score: 0 }));
  }

  const tokens = tokenize(query);
  const results: HelpSearchScore[] = [];

  for (const article of articles) {
    let score = 0;
    const title = article.title.toLowerCase();
    const description = article.shortDescription.toLowerCase();
    const haystack = searchableText(article);

    if (title.includes(normalized)) score += 12;
    if (description.includes(normalized)) score += 8;

    for (const token of tokens) {
      if (title.includes(token)) score += 5;
      if (description.includes(token)) score += 3;
      if (article.keywords.some((k) => k.toLowerCase().includes(token))) score += 4;
      if (article.chatbotKeywords.some((k) => k.toLowerCase().includes(token)))
        score += 3;
      if (haystack.includes(token)) score += 1;
    }

    if (score > 0) {
      results.push({ article, score });
    }
  }

  return results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.article.sortOrder - b.article.sortOrder;
  });
}

export function searchHelpArticles(
  articles: HelpArticle[],
  query: string,
): HelpArticle[] {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return [...articles].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return scoreHelpArticles(articles, query).map((r) => r.article);
}

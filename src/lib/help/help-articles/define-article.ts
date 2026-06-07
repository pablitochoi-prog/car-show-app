import type { HelpArticle } from "../help-types";

/** Shared defaults for starter articles. */
const DEFAULT_REVIEWED_AT = "2026-05-31";

type DefineArticleInput = Omit<
  HelpArticle,
  "lastReviewedAt" | "published" | "visibility"
> & {
  lastReviewedAt?: string;
  published?: boolean;
  visibility?: HelpArticle["visibility"];
};

export function defineArticle(input: DefineArticleInput): HelpArticle {
  return {
    lastReviewedAt: input.lastReviewedAt ?? DEFAULT_REVIEWED_AT,
    published: input.published ?? true,
    visibility: input.visibility ?? "public",
    ...input,
  };
}

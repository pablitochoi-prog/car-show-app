import type { ParsedAdminTableParams } from "./types";
import {
  findKnowledgeArticleIdsForKeywordsFilter,
  findKnowledgeArticleIdsMatchingKeywords,
} from "./knowledge-articles-keywords-search";
import { parseTextFilter } from "./text-filter";
import type { KnowledgeArticlesAdminWhereExtras } from "./knowledge-articles-table-config";

export async function resolveKnowledgeArticlesAdminWhereExtras(
  params: ParsedAdminTableParams,
): Promise<KnowledgeArticlesAdminWhereExtras> {
  const keywordSearchIds = params.q
    ? await findKnowledgeArticleIdsMatchingKeywords(params.q)
    : undefined;

  let keywordsFilterIds: string[] | undefined;
  if (params.filters.keywords) {
    const { mode, value } = parseTextFilter(params.filters.keywords);
    keywordsFilterIds = value
      ? await findKnowledgeArticleIdsForKeywordsFilter(mode, value)
      : [];
  }

  return { keywordSearchIds, keywordsFilterIds };
}

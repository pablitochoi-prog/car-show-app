import type { Prisma } from "@prisma/client";
import {
  HELP_AUDIENCES,
  HELP_CATEGORY_IDS,
  HELP_VISIBILITY_VALUES,
} from "@/lib/help/help-types";
import type { AdminTableConfig, ParsedAdminTableParams } from "./types";
import { applyTextFilterToFields, parseTextFilter, prismaStringFilter } from "./text-filter";

export const knowledgeArticlesAdminTableConfig: AdminTableConfig = {
  prefix: "knowledge",
  defaultSort: "articleNumber",
  defaultSortDir: "asc",
  defaultPageSize: 25,
  maxPageSize: 100,
  columns: [
    { id: "title", sortable: true, filterable: true, filterType: "text" },
    { id: "slug", sortable: true, filterable: true, filterType: "text" },
    { id: "article", sortable: false, filterable: true, filterType: "text" },
    {
      id: "category",
      sortable: true,
      filterable: true,
      filterType: "enum",
      enumValues: HELP_CATEGORY_IDS,
    },
    { id: "keywords", sortable: false, filterable: true, filterType: "text" },
    {
      id: "audience",
      sortable: true,
      filterable: true,
      filterType: "enum",
      enumValues: HELP_AUDIENCES,
    },
    {
      id: "published",
      sortable: true,
      filterable: true,
      filterType: "enum",
      enumValues: ["true", "false"],
    },
    {
      id: "visibility",
      sortable: true,
      filterable: true,
      filterType: "enum",
      enumValues: HELP_VISIBILITY_VALUES,
    },
    {
      id: "archived",
      sortable: false,
      filterable: true,
      filterType: "enum",
      enumValues: ["true", "false"],
    },
    { id: "articleNumber", sortable: true, filterable: false },
    { id: "sortOrder", sortable: true, filterable: false },
    { id: "updatedAt", sortable: true, filterable: false },
    { id: "lastReviewedAt", sortable: true, filterable: false },
  ],
};

export type KnowledgeArticlesAdminWhereExtras = {
  keywordSearchIds?: string[];
  keywordsFilterIds?: string[];
};

export function buildKnowledgeArticlesAdminWhere(
  params: ParsedAdminTableParams,
  extras: KnowledgeArticlesAdminWhereExtras = {},
): Prisma.KnowledgeArticleWhereInput {
  const and: Prisma.KnowledgeArticleWhereInput[] = [];

  if (params.q) {
    const term = params.q;
    const or: Prisma.KnowledgeArticleWhereInput[] = [
      { title: { contains: term, mode: "insensitive" } },
      { slug: { contains: term, mode: "insensitive" } },
      { shortDescription: { contains: term, mode: "insensitive" } },
      { articleBody: { contains: term, mode: "insensitive" } },
      { chatbotSummary: { contains: term, mode: "insensitive" } },
    ];
    if (extras.keywordSearchIds?.length) {
      or.push({ id: { in: extras.keywordSearchIds } });
    }
    and.push({ OR: or });
  }

  if (params.filters.title) {
    const clause = applyTextFilterToFields(["title"], params.filters.title);
    if (clause) and.push(clause);
  }

  if (params.filters.slug) {
    const clause = applyTextFilterToFields(["slug"], params.filters.slug);
    if (clause) and.push(clause);
  }

  if (params.filters.article) {
    const clause = applyTextFilterToFields(
      ["shortDescription", "articleBody", "chatbotSummary"],
      params.filters.article,
    );
    if (clause) and.push(clause);
  }

  if (params.filters.category) {
    const { mode, value } = parseTextFilter(params.filters.category);
    if (value) {
      and.push({ category: prismaStringFilter(mode, value) });
    }
  }

  if (params.filters.audience) {
    const { mode, value } = parseTextFilter(params.filters.audience);
    if (value) {
      and.push({ audience: prismaStringFilter(mode, value) });
    }
  }

  if (params.filters.keywords && extras.keywordsFilterIds !== undefined) {
    and.push({ id: { in: extras.keywordsFilterIds } });
  }

  if (params.filters.published === "true") and.push({ published: true });
  if (params.filters.published === "false") and.push({ published: false });

  if (params.filters.visibility) {
    and.push({ visibility: params.filters.visibility });
  }

  if (params.filters.archived === "true") {
    and.push({ archivedAt: { not: null } });
  } else if (params.filters.archived === "false" || !params.filters.archived) {
    and.push({ archivedAt: null });
  }

  return and.length > 0 ? { AND: and } : {};
}

export function buildKnowledgeArticlesAdminOrderBy(
  params: ParsedAdminTableParams,
): Prisma.KnowledgeArticleOrderByWithRelationInput {
  const dir = params.sortDir;
  switch (params.sort) {
    case "title":
      return { title: dir };
    case "slug":
      return { slug: dir };
    case "category":
      return { category: dir };
    case "audience":
      return { audience: dir };
    case "published":
      return { published: dir };
    case "visibility":
      return { visibility: dir };
    case "updatedAt":
      return { updatedAt: dir };
    case "lastReviewedAt":
      return { lastReviewedAt: dir };
    case "articleNumber":
      return { articleNumber: dir };
    case "sortOrder":
      return { sortOrder: dir };
    default:
      return { articleNumber: dir };
  }
}

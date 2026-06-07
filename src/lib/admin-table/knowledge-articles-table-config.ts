import type { Prisma } from "@prisma/client";
import {
  HELP_AUDIENCES,
  HELP_CATEGORY_IDS,
  HELP_VISIBILITY_VALUES,
} from "@/lib/help/help-types";
import type { AdminTableConfig, ParsedAdminTableParams } from "./types";

export const knowledgeArticlesAdminTableConfig: AdminTableConfig = {
  prefix: "knowledge",
  defaultSort: "sortOrder",
  defaultSortDir: "asc",
  defaultPageSize: 25,
  maxPageSize: 100,
  columns: [
    { id: "title", sortable: true, filterable: true, filterType: "text" },
    { id: "slug", sortable: true, filterable: true, filterType: "text" },
    {
      id: "category",
      sortable: true,
      filterable: true,
      filterType: "enum",
      enumValues: HELP_CATEGORY_IDS,
    },
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
    { id: "sortOrder", sortable: true, filterable: false },
    { id: "updatedAt", sortable: true, filterable: false },
    { id: "lastReviewedAt", sortable: true, filterable: false },
  ],
};

export function buildKnowledgeArticlesAdminWhere(
  params: ParsedAdminTableParams,
): Prisma.KnowledgeArticleWhereInput {
  const and: Prisma.KnowledgeArticleWhereInput[] = [];

  if (params.q) {
    const term = params.q;
    and.push({
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { slug: { contains: term, mode: "insensitive" } },
        { shortDescription: { contains: term, mode: "insensitive" } },
        { articleBody: { contains: term, mode: "insensitive" } },
        { chatbotSummary: { contains: term, mode: "insensitive" } },
        { keywords: { has: term } },
      ],
    });
  }

  if (params.filters.title) {
    and.push({
      title: { contains: params.filters.title, mode: "insensitive" },
    });
  }

  if (params.filters.slug) {
    and.push({
      slug: { contains: params.filters.slug, mode: "insensitive" },
    });
  }

  if (params.filters.category) {
    and.push({ category: params.filters.category });
  }

  if (params.filters.audience) {
    and.push({ audience: params.filters.audience });
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
    case "sortOrder":
    default:
      return { sortOrder: dir };
  }
}

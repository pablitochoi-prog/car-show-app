import { type NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  buildKnowledgeArticlesAdminOrderBy,
  buildKnowledgeArticlesAdminWhere,
  knowledgeArticlesAdminTableConfig,
} from "@/lib/admin-table/knowledge-articles-table-config";
import { parseAdminTableParams } from "@/lib/admin-table/parse-admin-table-params";
import {
  adminTableMeta,
  adminTableSkip,
} from "@/lib/admin-table/admin-table-response";
import {
  formInputToPrismaData,
  revalidateKnowledgeArticles,
} from "@/lib/help/knowledge-article-admin";
import { knowledgeArticleCreateSchema } from "@/lib/help/knowledge-article-schemas";
import { requireAdminApiUser } from "@/lib/help/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { response } = await requireAdminApiUser();
  if (response) return response;

  const params = parseAdminTableParams(
    req.nextUrl.searchParams,
    knowledgeArticlesAdminTableConfig,
  );
  const where = buildKnowledgeArticlesAdminWhere(params);
  const orderBy = buildKnowledgeArticlesAdminOrderBy(params);
  const skip = adminTableSkip(params.page, params.pageSize);

  const [total, articles] = await Promise.all([
    prisma.knowledgeArticle.count({ where }),
    prisma.knowledgeArticle.findMany({
      where,
      orderBy,
      skip,
      take: params.pageSize,
    }),
  ]);

  return NextResponse.json({
    articles,
    meta: adminTableMeta(total, params.page, params.pageSize),
  });
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireAdminApiUser();
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = knowledgeArticleCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid article data." },
      { status: 400 },
    );
  }

  try {
    const article = await prisma.knowledgeArticle.create({
      data: {
        ...formInputToPrismaData(parsed.data),
        createdByUserId: user!.id,
        updatedByUserId: user!.id,
      },
    });
    revalidateKnowledgeArticles(article.slug);
    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An article with this slug already exists." },
        { status: 409 },
      );
    }
    throw error;
  }
}

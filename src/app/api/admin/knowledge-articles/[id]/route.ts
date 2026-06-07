import { type NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  formInputToPrismaData,
  revalidateKnowledgeArticles,
} from "@/lib/help/knowledge-article-admin";
import { knowledgeArticleCreateSchema } from "@/lib/help/knowledge-article-schemas";
import { requireAdminApiUser } from "@/lib/help/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { response } = await requireAdminApiUser();
  if (response) return response;

  const { id } = await context.params;
  const article = await prisma.knowledgeArticle.findUnique({ where: { id } });
  if (!article) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }
  return NextResponse.json({ article });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { user, response } = await requireAdminApiUser();
  if (response) return response;

  const { id } = await context.params;
  const existing = await prisma.knowledgeArticle.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }

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
    const article = await prisma.knowledgeArticle.update({
      where: { id },
      data: {
        ...formInputToPrismaData(parsed.data),
        updatedByUserId: user!.id,
      },
    });
    revalidateKnowledgeArticles(article.slug);
    if (existing.slug !== article.slug) {
      revalidateKnowledgeArticles(existing.slug);
    }
    return NextResponse.json({ article });
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

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { response } = await requireAdminApiUser();
  if (response) return response;

  const { id } = await context.params;
  const existing = await prisma.knowledgeArticle.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }

  await prisma.knowledgeArticle.delete({ where: { id } });
  revalidateKnowledgeArticles(existing.slug);
  return NextResponse.json({ ok: true });
}

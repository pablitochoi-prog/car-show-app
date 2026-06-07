import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { revalidateKnowledgeArticles } from "@/lib/help/knowledge-article-admin";
import { requireAdminApiUser } from "@/lib/help/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApiUser();
  if (response) return response;

  const { id } = await context.params;
  const article = await prisma.knowledgeArticle.update({
    where: { id },
    data: { archivedAt: new Date(), updatedByUserId: user!.id },
  });

  revalidateKnowledgeArticles(article.slug);
  return NextResponse.json({ article });
}

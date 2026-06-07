import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { revalidateKnowledgeArticles } from "@/lib/help/knowledge-article-admin";
import { knowledgeArticleBulkSchema } from "@/lib/help/knowledge-article-schemas";
import { requireAdminApiUser } from "@/lib/help/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { user, response } = await requireAdminApiUser();
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = knowledgeArticleBulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid bulk request." },
      { status: 400 },
    );
  }

  const { action, ids } = parsed.data;
  const now = new Date();

  if (action === "publish") {
    await prisma.knowledgeArticle.updateMany({
      where: { id: { in: ids } },
      data: { published: true, updatedByUserId: user!.id },
    });
  } else if (action === "unpublish") {
    await prisma.knowledgeArticle.updateMany({
      where: { id: { in: ids } },
      data: { published: false, updatedByUserId: user!.id },
    });
  } else {
    await prisma.knowledgeArticle.updateMany({
      where: { id: { in: ids } },
      data: { archivedAt: now, updatedByUserId: user!.id },
    });
  }

  revalidateKnowledgeArticles();
  return NextResponse.json({ ok: true, updated: ids.length });
}

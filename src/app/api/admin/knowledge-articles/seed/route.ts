import { NextResponse } from "next/server";
import { revalidateKnowledgeArticles } from "@/lib/help/knowledge-article-admin";
import { requireAdminApiUser } from "@/lib/help/require-admin-api";
import { seedKnowledgeArticlesFromFiles } from "@/lib/help/seed-knowledge-articles-from-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const { user, response } = await requireAdminApiUser();
  if (response) return response;

  const result = await seedKnowledgeArticlesFromFiles(user!.id);
  revalidateKnowledgeArticles();
  return NextResponse.json(result);
}

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  buildKnowledgeArticlesAdminWhere,
  knowledgeArticlesAdminTableConfig,
} from "@/lib/admin-table/knowledge-articles-table-config";
import { parseAdminTableParams } from "@/lib/admin-table/parse-admin-table-params";
import { buildKnowledgeArticlesCsv } from "@/lib/help/knowledge-article-csv";
import { requireAdminApiUser } from "@/lib/help/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { response } = await requireAdminApiUser();
  if (response) return response;

  const idsParam = req.nextUrl.searchParams.get("ids")?.trim();
  let rows;

  if (idsParam) {
    const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
    rows = await prisma.knowledgeArticle.findMany({
      where: { id: { in: ids } },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });
  } else {
    const params = parseAdminTableParams(
      req.nextUrl.searchParams,
      knowledgeArticlesAdminTableConfig,
    );
    const where = buildKnowledgeArticlesAdminWhere(params);
    rows = await prisma.knowledgeArticle.findMany({
      where,
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });
  }

  const csv = buildKnowledgeArticlesCsv(rows);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="knowledge-articles-${date}.csv"`,
    },
  });
}

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  buildKnowledgeArticlesAdminWhere,
  knowledgeArticlesAdminTableConfig,
} from "@/lib/admin-table/knowledge-articles-table-config";
import { resolveKnowledgeArticlesAdminWhereExtras } from "@/lib/admin-table/resolve-knowledge-articles-where-extras";
import { parseAdminTableParams } from "@/lib/admin-table/parse-admin-table-params";
import { buildKnowledgeArticlesExcelResponse } from "@/lib/help/knowledge-article-excel-handlers";
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
    const whereExtras = await resolveKnowledgeArticlesAdminWhereExtras(params);
    const where = buildKnowledgeArticlesAdminWhere(params, whereExtras);
    rows = await prisma.knowledgeArticle.findMany({
      where,
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });
  }

  return buildKnowledgeArticlesExcelResponse(rows);
}

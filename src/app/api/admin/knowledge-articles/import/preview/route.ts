import { NextResponse } from "next/server";
import {
  parseKnowledgeArticlesExcelUpload,
  readKnowledgeArticlesExcelUpload,
} from "@/lib/help/knowledge-article-excel-handlers";
import { previewKnowledgeArticleImport } from "@/lib/help/knowledge-article-import";
import { requireAdminApiUser } from "@/lib/help/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { response } = await requireAdminApiUser();
  if (response) return response;

  const upload = await readKnowledgeArticlesExcelUpload(req);
  if (!upload.ok) return upload.response;

  const { rows, errors } = await parseKnowledgeArticlesExcelUpload(upload.buffer);
  const preview = await previewKnowledgeArticleImport(rows, errors);
  return NextResponse.json(preview);
}

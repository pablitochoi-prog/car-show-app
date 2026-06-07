import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyKnowledgeArticleImport,
  type KnowledgeImportConflictResolution,
} from "@/lib/help/knowledge-article-import";
import type { ParsedKnowledgeArticleCsvRow } from "@/lib/help/knowledge-article-csv";
import { requireAdminApiUser } from "@/lib/help/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const importSchema = z.object({
  rows: z.array(
    z.object({
      rowIndex: z.number().int(),
      input: z.record(z.string(), z.any()),
    }),
  ),
  resolutions: z.record(z.string(), z.enum(["replace", "keep_both"])),
  confirmReplace: z.boolean(),
});

export async function POST(req: Request) {
  const { user, response } = await requireAdminApiUser();
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid import payload." },
      { status: 400 },
    );
  }

  const result = await applyKnowledgeArticleImport({
    rows: parsed.data.rows as ParsedKnowledgeArticleCsvRow[],
    resolutions: parsed.data.resolutions as Record<
      string,
      KnowledgeImportConflictResolution
    >,
    confirmReplace: parsed.data.confirmReplace,
    userId: user!.id,
  });

  return NextResponse.json({ result });
}

import type { KnowledgeArticle } from "@prisma/client";
import {
  buildKnowledgeArticlesWorkbook,
  knowledgeArticlesExcelFilename,
  parseKnowledgeArticlesExcel,
} from "./knowledge-article-excel";

export async function buildKnowledgeArticlesExcelResponse(
  rows: KnowledgeArticle[],
): Promise<Response> {
  const buffer = await buildKnowledgeArticlesWorkbook(rows);
  const filename = knowledgeArticlesExcelFilename();

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export type ParsedKnowledgeExcelUpload =
  | { ok: true; buffer: Buffer }
  | { ok: false; response: Response };

export async function readKnowledgeArticlesExcelUpload(
  request: Request,
): Promise<ParsedKnowledgeExcelUpload> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return {
      ok: false,
      response: Response.json({ error: "Expected multipart form data." }, { status: 400 }),
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Upload a .xlsx file in the "file" field.' },
        { status: 400 },
      ),
    };
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return {
      ok: false,
      response: Response.json(
        { error: "Only .xlsx Excel files are supported." },
        { status: 400 },
      ),
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) {
    return {
      ok: false,
      response: Response.json({ error: "Uploaded file is empty." }, { status: 400 }),
    };
  }

  return { ok: true, buffer };
}

export async function parseKnowledgeArticlesExcelUpload(buffer: Buffer) {
  return parseKnowledgeArticlesExcel(buffer);
}

import type { ApiScoreSheetTemplate } from "@/lib/judging/scorecard-template-draft-mapper";
import { apiTemplateToDraft } from "@/lib/judging/scorecard-template-draft-mapper";
import type { ParsedScoringTemplateExcel } from "@/lib/judging/scoring-template-excel";
import {
  buildScoringTemplateWorkbook,
  parseScoringTemplateExcel,
  scoringTemplateExcelFilename,
} from "@/lib/judging/scoring-template-excel";

export async function buildScoringTemplateExcelResponse(
  template: ApiScoreSheetTemplate,
): Promise<Response> {
  const draft = apiTemplateToDraft(template);
  const buffer = await buildScoringTemplateWorkbook(draft);
  const filename = scoringTemplateExcelFilename(draft.name);

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export type ParsedExcelUpload =
  | { ok: true; data: ParsedScoringTemplateExcel }
  | { ok: false; response: Response };

export async function readScoringTemplateExcelUpload(
  request: Request,
): Promise<ParsedExcelUpload> {
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

  const parsed = await parseScoringTemplateExcel(buffer);
  if (!parsed.ok) {
    return {
      ok: false,
      response: Response.json(
        { error: "Could not import spreadsheet.", errors: parsed.errors },
        { status: 400 },
      ),
    };
  }

  return { ok: true, data: parsed.data };
}

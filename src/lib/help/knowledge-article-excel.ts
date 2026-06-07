import type { KnowledgeArticle } from "@prisma/client";
import ExcelJS from "exceljs";
import {
  KNOWLEDGE_ARTICLE_EXPORT_COLUMNS,
  knowledgeArticleToExportCells,
  parseKnowledgeArticleRow,
} from "./knowledge-article-row-parse";
import type { KnowledgeArticleCsvParseResult, ParsedKnowledgeArticleCsvRow } from "./knowledge-article-csv";

const SHEET_INSTRUCTIONS = "Instructions";
const SHEET_ARTICLES = "Articles";

const INSTRUCTION_LINES = [
  "Knowledge articles — edit in Excel and re-import via Import Knowledge Articles.",
  "",
  "Articles sheet: one row per article. Do not rename header columns.",
  "",
  "Multiline text fields (shortDescription, whoThisIsFor, articleBody, etc.):",
  "  Type normally in the cell. Press Alt+Enter (Windows) or Control+Option+Enter (Mac) for a new line.",
  "  Turn on Wrap Text in Excel for easier editing.",
  "",
  "beforeYouStart, relatedWebsitePages, relatedFeatures: one item per line in the cell.",
  "keywords, chatbotKeywords, relatedArticleIds: comma-separated values.",
  "",
  "stepByStepInstructions (one cell):",
  "  ## Step title",
  "  Step body text (can span multiple lines)",
  "  (blank line)",
  "  ## Next step title",
  "  Next step body",
  "",
  "frequentlyAskedQuestions (one cell):",
  "  ## Question text",
  "  Answer text (can span multiple lines)",
  "  (blank line between FAQs)",
  "",
  "published, featured, popular: true or false",
  "lastReviewedAt: YYYY-MM-DD",
  "articleNumber is read-only on import (used for reference).",
  "",
  "If chatbotKeywords is blank, it is copied from the keywords column on import.",
  "If chatbotSummary is blank, it is built from shortDescription and step-by-step instructions.",
];

const WRAP_TEXT_COLUMNS = new Set([
  "shortDescription",
  "whoThisIsFor",
  "whatThisHelpsYouDo",
  "beforeYouStart",
  "stepByStepInstructions",
  "whatHappensNext",
  "frequentlyAskedQuestions",
  "articleBody",
  "chatbotSummary",
  "relatedWebsitePages",
  "relatedFeatures",
]);

const COLUMN_WIDTHS: Partial<Record<string, number>> = {
  articleNumber: 12,
  title: 36,
  shortDescription: 40,
  whoThisIsFor: 36,
  whatThisHelpsYouDo: 36,
  beforeYouStart: 36,
  stepByStepInstructions: 48,
  whatHappensNext: 36,
  frequentlyAskedQuestions: 48,
  articleBody: 48,
  chatbotSummary: 40,
  chatbotKeywords: 28,
  keywords: 28,
  audience: 14,
  slug: 28,
  category: 18,
  relatedWebsitePages: 28,
  relatedFeatures: 24,
  relatedArticleIds: 24,
  visibility: 14,
  published: 10,
  featured: 10,
  popular: 10,
  sortOrder: 10,
  lastReviewedAt: 14,
};

function headerMap(row: ExcelJS.Row): Map<string, number> {
  const map = new Map<string, number>();
  row.eachCell((cell, col) => {
    const key = String(cell.value ?? "").trim();
    if (key) map.set(key, col);
  });
  return map;
}

function cellStr(row: ExcelJS.Row, col: number | undefined): string {
  if (!col) return "";
  const v = row.getCell(col).value;
  if (v == null) return "";
  if (typeof v === "object" && "richText" in v && Array.isArray(v.richText)) {
    return v.richText.map((part) => part.text ?? "").join("").trim();
  }
  if (typeof v === "object" && "text" in v && typeof v.text === "string") {
    return v.text.trim();
  }
  if (typeof v === "object" && "result" in v) {
    return String(v.result ?? "").trim();
  }
  if (v instanceof Date) {
    return v.toISOString().slice(0, 10);
  }
  return String(v).trim();
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.alignment = { vertical: "middle", wrapText: true };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8EEF4" },
  };
}

export function knowledgeArticlesExcelFilename(date = new Date()): string {
  return `knowledge-articles-${date.toISOString().slice(0, 10)}.xlsx`;
}

export async function buildKnowledgeArticlesWorkbook(
  rows: KnowledgeArticle[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Car Show Events";
  wb.created = new Date();

  const wsInst = wb.addWorksheet(SHEET_INSTRUCTIONS);
  INSTRUCTION_LINES.forEach((line, i) => {
    wsInst.getCell(i + 1, 1).value = line;
  });
  wsInst.getColumn(1).width = 92;

  const ws = wb.addWorksheet(SHEET_ARTICLES);
  ws.addRow([...KNOWLEDGE_ARTICLE_EXPORT_COLUMNS]);
  styleHeaderRow(ws.getRow(1));

  for (const article of rows) {
    const cells = knowledgeArticleToExportCells(article);
    const values = KNOWLEDGE_ARTICLE_EXPORT_COLUMNS.map((col) => cells[col] ?? "");
    const dataRow = ws.addRow(values);
    dataRow.alignment = { vertical: "top", wrapText: true };
  }

  KNOWLEDGE_ARTICLE_EXPORT_COLUMNS.forEach((col, index) => {
    const column = ws.getColumn(index + 1);
    column.width = COLUMN_WIDTHS[col] ?? 20;
    if (WRAP_TEXT_COLUMNS.has(col)) {
      column.alignment = { wrapText: true, vertical: "top" };
    }
  });

  ws.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function toArrayBuffer(data: Buffer | Uint8Array): ArrayBuffer {
  const view = data instanceof Buffer ? data : Buffer.from(data);
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
}

export async function parseKnowledgeArticlesExcel(
  buffer: Buffer,
): Promise<KnowledgeArticleCsvParseResult> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(toArrayBuffer(buffer));
  } catch {
    return { rows: [], errors: ["File is not a valid Excel workbook (.xlsx)."] };
  }

  const ws =
    wb.getWorksheet(SHEET_ARTICLES) ??
    wb.worksheets.find((sheet) => sheet.name.toLowerCase() === "articles") ??
    wb.worksheets[0];

  if (!ws) {
    return { rows: [], errors: ["Workbook has no worksheets."] };
  }

  const headers = headerMap(ws.getRow(1));
  if (!headers.has("slug")) {
    return {
      rows: [],
      errors: ['Articles sheet must include a "slug" column in the header row.'],
    };
  }

  const parsedRows: ParsedKnowledgeArticleCsvRow[] = [];
  const errors: string[] = [];

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const hasData = KNOWLEDGE_ARTICLE_EXPORT_COLUMNS.some((col) => {
      const idx = headers.get(col);
      return idx ? cellStr(row, idx).length > 0 : false;
    });
    if (!hasData) return;

    const get = (name: string): string => cellStr(row, headers.get(name));
    const result = parseKnowledgeArticleRow(get, rowNumber);
    if (result.error) errors.push(result.error);
    else if (result.input) parsedRows.push({ rowIndex: rowNumber, input: result.input });
  });

  if (parsedRows.length === 0 && errors.length === 0) {
    errors.push("No article rows found below the header row.");
  }

  return { rows: parsedRows, errors };
}

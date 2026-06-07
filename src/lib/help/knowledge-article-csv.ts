import type { KnowledgeArticle } from "@prisma/client";
import { csvRow } from "@/lib/event-reports/csv";
import { KNOWLEDGE_ARTICLE_EXPORT_COLUMNS } from "./knowledge-article-export-columns";
import {
  knowledgeArticleToExportCells,
  parseKnowledgeArticleRow,
} from "./knowledge-article-row-parse";
import type { KnowledgeArticleFormInput } from "./knowledge-article-schemas";

export const KNOWLEDGE_ARTICLE_CSV_HEADERS = KNOWLEDGE_ARTICLE_EXPORT_COLUMNS;

export type ParsedKnowledgeArticleCsvRow = {
  rowIndex: number;
  input: KnowledgeArticleFormInput;
};

export type KnowledgeArticleCsvParseResult = {
  rows: ParsedKnowledgeArticleCsvRow[];
  errors: string[];
};

/** Parse one CSV document into rows of string cells (handles quoted fields). */
export function parseCsvDocument(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(cell);
      cell = "";
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      if (ch === "\r") i += 1;
    } else if (ch !== "\r") {
      cell += ch;
    }
  }

  row.push(cell);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

export function parseKnowledgeArticlesCsv(text: string): KnowledgeArticleCsvParseResult {
  const grid = parseCsvDocument(text.trim());
  if (grid.length < 2) {
    return { rows: [], errors: ["CSV must include a header row and at least one data row."] };
  }

  const headers = grid[0].map((h) => h.trim());
  if (!headers.includes("slug")) {
    return { rows: [], errors: ["CSV header row must include a slug column."] };
  }

  const rows: ParsedKnowledgeArticleCsvRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < grid.length; i += 1) {
    const rowIndex = i + 1;
    const values = grid[i];
    const get = (name: string): string => {
      const idx = headers.indexOf(name);
      return idx >= 0 ? (values[idx] ?? "").trim() : "";
    };
    const result = parseKnowledgeArticleRow(get, rowIndex);
    if (result.error) errors.push(result.error);
    else if (result.input) rows.push({ rowIndex, input: result.input });
  }

  return { rows, errors };
}

export function knowledgeArticleToCsvRow(row: KnowledgeArticle): string {
  const cells = knowledgeArticleToExportCells(row);
  return csvRow(KNOWLEDGE_ARTICLE_EXPORT_COLUMNS.map((col) => cells[col] ?? ""));
}

export function buildKnowledgeArticlesCsv(rows: KnowledgeArticle[]): string {
  const lines = [csvRow([...KNOWLEDGE_ARTICLE_EXPORT_COLUMNS])];
  for (const row of rows) {
    lines.push(knowledgeArticleToCsvRow(row));
  }
  return `${lines.join("\n")}\n`;
}

import type { JudgingMethodology } from "@prisma/client";
import ExcelJS from "exceljs";
import type { TemplateDraft } from "@/components/organizer/awards-judging/score-sheet-types";
import {
  defaultFullDeductionOption,
  defaultLevelsDeductionOptions,
} from "@/components/organizer/awards-judging/score-sheet-types";
import type {
  TemplateDeductionInput,
  TemplateItemInput,
  TemplateSectionInput,
} from "@/lib/judging/event-judging-template-validation";

const SHEET_INSTRUCTIONS = "Instructions";
const SHEET_TEMPLATE = "Template";
const SHEET_CATEGORIES = "Categories";
const SHEET_SUBCATEGORIES = "Subcategories";
const SHEET_DEDUCTIONS = "Deductions";

export type ScoringTemplateExcelMeta = {
  name: string;
  description: string | null;
  totalPoints: number;
  scoringGroup: string | null;
  vehicleType: string | null;
  methodology: JudgingMethodology;
};

export type ParsedScoringTemplateExcel = {
  meta: ScoringTemplateExcelMeta;
  sections: TemplateSectionInput[];
};

const INSTRUCTION_LINES = [
  "Scoring template spreadsheet — edit and re-import via Import from Excel.",
  "",
  "Template: one row of settings (name, total points, organization, vehicle type, scoring method).",
  "Categories: one row per judging category (section).",
  "Subcategories: one row per scored line item; category_name must match Categories.",
  "Deductions: increment/violation rows for LEVELS and FULL scoring types (not DISCRETIONARY).",
  "",
  "scoring_method: DEDUCTION | ADDITIVE | ORIGINALITY_CONDITION",
  "scoring_type: FULL | LEVELS | DISCRETIONARY",
  "point_type: ADD | DEDUCT | (leave blank)",
  "active: Y or N",
  "notes_required_for_deduction: Y or N",
  "deduction_bucket: ORIGINALITY | CONDITION | (blank)",
];

function slugFilename(name: string): string {
  const base = name.trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
  return (base || "scoring-template").slice(0, 80);
}

function headerMap(row: ExcelJS.Row): Map<string, number> {
  const map = new Map<string, number>();
  row.eachCell((cell, col) => {
    const key = String(cell.value ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    if (key) map.set(key, col);
  });
  return map;
}

function cellStr(row: ExcelJS.Row, col: number | undefined): string {
  if (!col) return "";
  const v = row.getCell(col).value;
  if (v == null) return "";
  if (typeof v === "object" && "text" in v && typeof v.text === "string") {
    return v.text.trim();
  }
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

function cellNum(row: ExcelJS.Row, col: number | undefined): number | null {
  const s = cellStr(row, col);
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseBool(raw: string, field: string, errors: string[], rowLabel: string): boolean {
  const v = raw.trim().toLowerCase();
  if (v === "" || v === "y" || v === "yes" || v === "true" || v === "1") return true;
  if (v === "n" || v === "no" || v === "false" || v === "0") return false;
  errors.push(`${rowLabel}: ${field} must be Y or N (got "${raw}").`);
  return true;
}

function parseMethodology(
  raw: string,
  errors: string[],
): JudgingMethodology | null {
  const v = raw.trim().toUpperCase().replace(/\s+/g, "_");
  if (v === "DEDUCTION" || v === "ADDITIVE" || v === "ORIGINALITY_CONDITION") {
    return v;
  }
  errors.push(
    `Template scoring_method must be DEDUCTION, ADDITIVE, or ORIGINALITY_CONDITION.`,
  );
  return null;
}

function parseScoringType(
  raw: string,
  errors: string[],
  rowLabel: string,
): TemplateItemInput["scoringType"] | null {
  const v = raw.trim().toUpperCase();
  if (v === "FULL" || v === "LEVELS" || v === "DISCRETIONARY") return v;
  errors.push(`${rowLabel}: scoring_type must be FULL, LEVELS, or DISCRETIONARY.`);
  return null;
}

function parsePointType(raw: string): TemplateItemInput["pointType"] {
  const v = raw.trim().toUpperCase();
  if (v === "ADD" || v === "DEDUCT") return v;
  return null;
}

function parseBucket(
  raw: string,
): TemplateDeductionInput["deductionBucket"] {
  const v = raw.trim().toUpperCase();
  if (v === "ORIGINALITY" || v === "CONDITION") return v;
  return null;
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.alignment = { vertical: "middle", wrapText: true };
}

export async function buildScoringTemplateWorkbook(
  draft: TemplateDraft,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Car Show Events";
  wb.created = new Date();

  const wsInst = wb.addWorksheet(SHEET_INSTRUCTIONS);
  INSTRUCTION_LINES.forEach((line, i) => {
    wsInst.getCell(i + 1, 1).value = line;
  });
  wsInst.getColumn(1).width = 90;

  const wsTpl = wb.addWorksheet(SHEET_TEMPLATE);
  wsTpl.addRow([
    "template_name",
    "description",
    "total_points",
    "organization",
    "vehicle_type",
    "scoring_method",
  ]);
  styleHeaderRow(wsTpl.getRow(1));
  wsTpl.addRow([
    draft.name,
    draft.description,
    draft.totalPoints,
    draft.scoringGroup,
    draft.vehicleType,
    draft.methodology,
  ]);
  wsTpl.columns = [
    { width: 28 },
    { width: 40 },
    { width: 12 },
    { width: 16 },
    { width: 16 },
    { width: 22 },
  ];

  const wsCat = wb.addWorksheet(SHEET_CATEGORIES);
  wsCat.addRow([
    "category_id",
    "category_name",
    "sort_order",
    "weight_percent",
    "max_score",
    "judge_guidance",
    "active",
  ]);
  styleHeaderRow(wsCat.getRow(1));
  for (const section of draft.sections) {
    wsCat.addRow([
      section.clientKey.startsWith("tmp-") ? "" : section.clientKey,
      section.name,
      section.sortOrder,
      section.weightPercent,
      section.maxSectionPoints,
      section.judgeGuidance,
      section.isActive !== false ? "Y" : "N",
    ]);
  }
  wsCat.columns = [
    { width: 28 },
    { width: 28 },
    { width: 10 },
    { width: 14 },
    { width: 10 },
    { width: 36 },
    { width: 8 },
  ];

  const wsSub = wb.addWorksheet(SHEET_SUBCATEGORIES);
  wsSub.addRow([
    "category_name",
    "subcategory_id",
    "label",
    "sort_order",
    "max_points",
    "indented",
    "point_type",
    "scoring_type",
    "allow_multiple_violations",
    "notes_required_for_deduction",
    "judge_guidance",
    "active",
  ]);
  styleHeaderRow(wsSub.getRow(1));
  for (const section of draft.sections) {
    for (const item of section.items) {
      wsSub.addRow([
        section.name,
        item.clientKey.startsWith("tmp-") ? "" : item.clientKey,
        item.label,
        item.sortOrder,
        item.maxPoints,
        item.isIndented ? "Y" : "N",
        item.pointType ?? "",
        item.scoringType,
        item.allowMultipleViolations ? "Y" : "N",
        item.requiresCommentOnDeduction ? "Y" : "N",
        item.judgeGuidance,
        item.isActive !== false ? "Y" : "N",
      ]);
    }
  }
  wsSub.columns = [
    { width: 24 },
    { width: 28 },
    { width: 32 },
    { width: 10 },
    { width: 10 },
    { width: 8 },
    { width: 10 },
    { width: 14 },
    { width: 22 },
    { width: 26 },
    { width: 36 },
    { width: 8 },
  ];

  const wsDed = wb.addWorksheet(SHEET_DEDUCTIONS);
  wsDed.addRow([
    "category_name",
    "subcategory_label",
    "deduction_id",
    "label",
    "points_deducted",
    "sort_order",
    "deduction_bucket",
  ]);
  styleHeaderRow(wsDed.getRow(1));
  for (const section of draft.sections) {
    for (const item of section.items) {
      if (item.scoringType === "DISCRETIONARY") continue;
      for (const opt of item.deductionOptions) {
        wsDed.addRow([
          section.name,
          item.label,
          opt.clientKey.startsWith("tmp-") ? "" : opt.clientKey,
          opt.label,
          opt.pointsDeducted,
          opt.sortOrder,
          opt.deductionBucket ?? "",
        ]);
      }
    }
  }
  wsDed.columns = [
    { width: 24 },
    { width: 32 },
    { width: 28 },
    { width: 24 },
    { width: 16 },
    { width: 10 },
    { width: 16 },
  ];

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function scoringTemplateExcelFilename(draftName: string): string {
  return `${slugFilename(draftName)}-scoring-template.xlsx`;
}

function toArrayBuffer(data: Buffer | Uint8Array): ArrayBuffer {
  const view = data instanceof Uint8Array ? data : new Uint8Array(data);
  return view.buffer.slice(
    view.byteOffset,
    view.byteOffset + view.byteLength,
  ) as ArrayBuffer;
}

export async function parseScoringTemplateExcel(
  buffer: Buffer | Uint8Array,
): Promise<
  | { ok: true; data: ParsedScoringTemplateExcel }
  | { ok: false; errors: string[] }
> {
  const errors: string[] = [];
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(toArrayBuffer(buffer));
  } catch {
    return { ok: false, errors: ["File is not a valid Excel workbook (.xlsx)."] };
  }

  const wsTpl = wb.getWorksheet(SHEET_TEMPLATE);
  const wsCat = wb.getWorksheet(SHEET_CATEGORIES);
  const wsSub = wb.getWorksheet(SHEET_SUBCATEGORIES);
  const wsDed = wb.getWorksheet(SHEET_DEDUCTIONS);

  if (!wsTpl || !wsCat || !wsSub) {
    return {
      ok: false,
      errors: [
        "Workbook must include sheets: Template, Categories, and Subcategories.",
      ],
    };
  }

  const tplHeaders = headerMap(wsTpl.getRow(1));
  const tplRow = wsTpl.getRow(2);
  const name = cellStr(tplRow, tplHeaders.get("template_name"));
  if (!name) errors.push("Template sheet: template_name is required.");

  const totalRaw = cellNum(tplRow, tplHeaders.get("total_points"));
  if (totalRaw == null || !Number.isInteger(totalRaw) || totalRaw <= 0) {
    errors.push("Template sheet: total_points must be a positive integer.");
  }

  const methodology = parseMethodology(
    cellStr(tplRow, tplHeaders.get("scoring_method")),
    errors,
  );

  const meta: ScoringTemplateExcelMeta = {
    name,
    description: cellStr(tplRow, tplHeaders.get("description")) || null,
    totalPoints: totalRaw ?? 0,
    scoringGroup:
      cellStr(tplRow, tplHeaders.get("organization")) || null,
    vehicleType: cellStr(tplRow, tplHeaders.get("vehicle_type")) || null,
    methodology: methodology ?? "DEDUCTION",
  };

  type CategoryRow = {
    name: string;
    sortOrder: number;
    weightPercent: number | null;
    maxSectionPoints: number | null;
    judgeGuidance: string | null;
    isActive: boolean;
  };

  const catHeaders = headerMap(wsCat.getRow(1));
  const categories: CategoryRow[] = [];
  wsCat.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const catName = cellStr(row, catHeaders.get("category_name"));
    if (!catName) return;
    const sortOrder = cellNum(row, catHeaders.get("sort_order")) ?? categories.length;
    const maxRaw = cellStr(row, catHeaders.get("max_score"));
    let maxSectionPoints: number | null = null;
    if (maxRaw !== "") {
      const n = parseInt(maxRaw, 10);
      if (!Number.isInteger(n) || n <= 0) {
        errors.push(`Categories row ${rowNum}: max_score must be a positive integer.`);
      } else {
        maxSectionPoints = n;
      }
    }
    const weightRaw = cellStr(row, catHeaders.get("weight_percent"));
    let weightPercent: number | null = null;
    if (weightRaw !== "") {
      const w = parseFloat(weightRaw);
      if (!Number.isFinite(w)) {
        errors.push(`Categories row ${rowNum}: weight_percent must be a number.`);
      } else {
        weightPercent = w;
      }
    }
    categories.push({
      name: catName,
      sortOrder,
      weightPercent,
      maxSectionPoints,
      judgeGuidance: cellStr(row, catHeaders.get("judge_guidance")) || null,
      isActive: parseBool(
        cellStr(row, catHeaders.get("active")),
        "active",
        errors,
        `Categories row ${rowNum}`,
      ),
    });
  });

  if (categories.length === 0) {
    errors.push("Categories sheet must have at least one category row.");
  }

  categories.sort((a, b) => a.sortOrder - b.sortOrder);

  const subHeaders = headerMap(wsSub.getRow(1));
  type SubRow = {
    categoryName: string;
    label: string;
    sortOrder: number;
    maxPoints: number;
    isIndented: boolean;
    pointType: TemplateItemInput["pointType"];
    scoringType: NonNullable<TemplateItemInput["scoringType"]>;
    allowMultipleViolations: boolean;
    requiresCommentOnDeduction: boolean;
    judgeGuidance: string | null;
    isActive: boolean;
  };
  const subRows: SubRow[] = [];
  wsSub.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const categoryName = cellStr(row, subHeaders.get("category_name"));
    const label = cellStr(row, subHeaders.get("label"));
    if (!categoryName || !label) return;
    const rowLabel = `Subcategories row ${rowNum}`;
    const maxPoints = cellNum(row, subHeaders.get("max_points"));
    if (maxPoints == null || maxPoints < 0) {
      errors.push(`${rowLabel}: max_points is required.`);
    }
    const scoringType = parseScoringType(
      cellStr(row, subHeaders.get("scoring_type")),
      errors,
      rowLabel,
    );
    if (!scoringType) return;
    subRows.push({
      categoryName,
      label,
      sortOrder: cellNum(row, subHeaders.get("sort_order")) ?? subRows.length,
      maxPoints: maxPoints ?? 0,
      isIndented: parseBool(
        cellStr(row, subHeaders.get("indented")),
        "indented",
        errors,
        rowLabel,
      ),
      pointType: parsePointType(cellStr(row, subHeaders.get("point_type"))),
      scoringType,
      allowMultipleViolations: parseBool(
        cellStr(row, subHeaders.get("allow_multiple_violations")),
        "allow_multiple_violations",
        errors,
        rowLabel,
      ),
      requiresCommentOnDeduction: parseBool(
        cellStr(row, subHeaders.get("notes_required_for_deduction")),
        "notes_required_for_deduction",
        errors,
        rowLabel,
      ),
      judgeGuidance: cellStr(row, subHeaders.get("judge_guidance")) || null,
      isActive: parseBool(
        cellStr(row, subHeaders.get("active")),
        "active",
        errors,
        rowLabel,
      ),
    });
  });

  const dedByItem = new Map<string, TemplateDeductionInput[]>();
  if (wsDed) {
    const dedHeaders = headerMap(wsDed.getRow(1));
    wsDed.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      const categoryName = cellStr(row, dedHeaders.get("category_name"));
      const subLabel = cellStr(row, dedHeaders.get("subcategory_label"));
      const label = cellStr(row, dedHeaders.get("label"));
      if (!categoryName || !subLabel || !label) return;
      const key = `${categoryName}\0${subLabel}`;
      const points = cellNum(row, dedHeaders.get("points_deducted"));
      if (points == null || points < 0) {
        errors.push(`Deductions row ${rowNum}: points_deducted is required.`);
        return;
      }
      const list = dedByItem.get(key) ?? [];
      list.push({
        label,
        pointsDeducted: points,
        sortOrder: cellNum(row, dedHeaders.get("sort_order")) ?? list.length,
        deductionBucket: parseBucket(
          cellStr(row, dedHeaders.get("deduction_bucket")),
        ),
      });
      dedByItem.set(key, list);
    });
  }

  const categoryNames = new Set(categories.map((c) => c.name));
  for (const sub of subRows) {
    if (!categoryNames.has(sub.categoryName)) {
      errors.push(
        `Subcategory "${sub.label}" references unknown category "${sub.categoryName}".`,
      );
    }
  }

  const sections: TemplateSectionInput[] = categories.map((cat, si) => {
    const itemsForCat = subRows
      .filter((s) => s.categoryName === cat.name)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const items: TemplateItemInput[] = itemsForCat.map((sub, ii) => {
      const dedKey = `${cat.name}\0${sub.label}`;
      let deductionOptions = dedByItem.get(dedKey) ?? [];
      if (sub.scoringType === "DISCRETIONARY") {
        deductionOptions = [];
      } else if (deductionOptions.length === 0) {
        if (sub.scoringType === "LEVELS") {
          deductionOptions = defaultLevelsDeductionOptions(sub.maxPoints).map(
            (d, oi) => ({
              label: d.label,
              pointsDeducted: d.pointsDeducted,
              sortOrder: oi,
              deductionBucket: d.deductionBucket,
            }),
          );
        } else {
          const draftItem = {
            maxPoints: sub.maxPoints,
            allowMultipleViolations: sub.allowMultipleViolations,
          };
          const opt = defaultFullDeductionOption(draftItem);
          deductionOptions = [
            {
              label: opt.label,
              pointsDeducted: opt.pointsDeducted,
              sortOrder: 0,
              deductionBucket: opt.deductionBucket,
            },
          ];
        }
      } else {
        deductionOptions = [...deductionOptions].sort(
          (a, b) => a.sortOrder - b.sortOrder,
        );
      }

      return {
        label: sub.label,
        sortOrder: ii,
        maxPoints: sub.maxPoints,
        isIndented: sub.isIndented,
        pointType: sub.pointType,
        scoringType: sub.scoringType,
        allowMultipleViolations:
          sub.scoringType === "DISCRETIONARY"
            ? false
            : sub.allowMultipleViolations,
        judgeGuidance: sub.judgeGuidance,
        requiresCommentOnDeduction: sub.requiresCommentOnDeduction,
        isActive: sub.isActive,
        deductionOptions,
      };
    });

    return {
      name: cat.name,
      sortOrder: si,
      weightPercent: cat.weightPercent,
      maxSectionPoints: cat.maxSectionPoints,
      judgeGuidance: cat.judgeGuidance,
      isActive: cat.isActive,
      items,
    };
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: { meta, sections } };
}

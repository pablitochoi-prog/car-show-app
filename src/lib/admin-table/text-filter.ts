import type { Prisma } from "@prisma/client";

export const TEXT_FILTER_MODES = [
  "equals",
  "contains",
  "startsWith",
  "endsWith",
  "notContains",
] as const;

/** Single-mode filter for columns that only support substring search. */
export const CONTAINS_TEXT_FILTER_MODES = ["contains"] as const satisfies readonly TextFilterMode[];

export type TextFilterMode = (typeof TEXT_FILTER_MODES)[number];

export const TEXT_FILTER_MODE_LABELS: Record<TextFilterMode, string> = {
  equals: "Equals",
  contains: "Contains",
  startsWith: "Begins with",
  endsWith: "Ends with",
  notContains: "Does not contain",
};

export function encodeTextFilter(mode: TextFilterMode, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return `${mode}:${trimmed}`;
}

export function parseTextFilter(raw: string): { mode: TextFilterMode; value: string } {
  const trimmed = raw.trim();
  for (const mode of TEXT_FILTER_MODES) {
    const prefix = `${mode}:`;
    if (trimmed.startsWith(prefix)) {
      return { mode, value: trimmed.slice(prefix.length) };
    }
  }
  return { mode: "contains", value: trimmed };
}

export function prismaStringFilter(
  mode: TextFilterMode,
  value: string,
): Prisma.StringFilter {
  const insensitive = { mode: "insensitive" as const };
  switch (mode) {
    case "equals":
      return { equals: value, ...insensitive };
    case "startsWith":
      return { startsWith: value, ...insensitive };
    case "endsWith":
      return { endsWith: value, ...insensitive };
    case "notContains":
      return { not: { contains: value, ...insensitive } };
    case "contains":
    default:
      return { contains: value, ...insensitive };
  }
}

export function applyTextFilterToFields(
  fields: string[],
  rawFilter: string,
): Record<string, unknown> | { OR: Record<string, unknown>[] } | null {
  const { mode, value } = parseTextFilter(rawFilter);
  if (!value) return null;

  if (fields.length === 1) {
    return { [fields[0]]: prismaStringFilter(mode, value) };
  }

  return {
    OR: fields.map((field) => ({
      [field]: prismaStringFilter(mode, value),
    })),
  };
}

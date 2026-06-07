import type { OrganizerScoreSheetItemView } from "@/lib/judging/organizer-score-sheet-vehicle-detail";

export function formatScorePoints(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function resolveSectionMaxPoints(
  maxSectionPoints: number | null,
  items: Array<{ maxPoints: number }>,
): number {
  return (
    maxSectionPoints ?? items.reduce((sum, item) => sum + item.maxPoints, 0)
  );
}

/** Total deduction points recorded on one subcategory line. */
export function organizerItemDeductionTotal(
  item: OrganizerScoreSheetItemView,
  methodology: string,
): number {
  if (methodology === "ADDITIVE") return 0;
  return item.deductions.reduce((sum, d) => sum + d.pointsDeducted, 0);
}

/** Deduction column: amount or blank. */
export function formatOrganizerItemDeduction(
  item: OrganizerScoreSheetItemView,
  methodology: string,
): string {
  const total = organizerItemDeductionTotal(item, methodology);
  return total > 0 ? String(total) : "";
}

/** Notes column: item notes, deduction comments, and additive awarded points. */
export function formatOrganizerItemNotes(
  item: OrganizerScoreSheetItemView,
  methodology: string,
): string {
  const parts: string[] = [];

  if (methodology === "ADDITIVE" && item.awardedPoints != null) {
    parts.push(`Awarded: ${item.awardedPoints} pts`);
  }

  for (const d of item.deductions) {
    if (d.comment?.trim()) {
      parts.push(d.comment.trim());
    } else if (d.label.trim() && item.deductions.length > 1) {
      parts.push(d.label.trim());
    }
  }

  if (item.itemNotes?.trim()) {
    parts.push(item.itemNotes.trim());
  }

  return parts.join("\n");
}

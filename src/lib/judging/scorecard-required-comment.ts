/** Client-safe helpers for required deduction notes (no Prisma / server imports). */

export type ScorecardUiDraftLike = {
  discretionaryPoints: string;
  selectedOptionIds: string[];
  itemNotes: string;
};

export type ScorecardUiItemLike = {
  scoringType: string;
  requiresCommentOnDeduction: boolean;
  maxPoints: number;
};

/** True when a deduction is applied but the required note is still empty. */
export function itemDraftMissingRequiredComment(
  item: ScorecardUiItemLike,
  draft: ScorecardUiDraftLike,
): boolean {
  if (!item.requiresCommentOnDeduction) return false;

  if (item.scoringType === "DISCRETIONARY") {
    const trimmed = draft.discretionaryPoints.trim();
    const raw = trimmed === "" ? 0 : Number(trimmed);
    if (!Number.isFinite(raw) || raw <= 0) return false;
    return draft.itemNotes.trim().length === 0;
  }

  if (draft.selectedOptionIds.length === 0) return false;
  return draft.itemNotes.trim().length === 0;
}

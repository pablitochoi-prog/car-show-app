/** Shared keys for matching template/score-sheet sections and items across sync. */

export function sectionMatchKey(section: { sortOrder: number; name: string }): string {
  return `${section.sortOrder}\u0000${section.name.trim()}`;
}

export function itemMatchKey(item: { sortOrder: number; label: string }): string {
  return `${item.sortOrder}\u0000${item.label.trim()}`;
}

export function deductionOptionsFingerprint(
  options: Array<{ label: string; pointsDeducted: number; sortOrder: number }>,
): string {
  return options
    .map((o) => `${o.sortOrder}|${o.label.trim()}|${o.pointsDeducted}`)
    .join(";");
}

export function shouldReplaceDeductionOptions(
  existing: {
    scoringType: string;
    allowMultipleViolations: boolean;
    maxPoints: number;
    deductionOptions: Array<{
      label: string;
      pointsDeducted: number;
      sortOrder: number;
    }>;
  },
  incoming: {
    scoringType?: string;
    allowMultipleViolations?: boolean;
    maxPoints: number;
    deductionOptions: Array<{
      label: string;
      pointsDeducted: number;
      sortOrder: number;
    }>;
  },
): boolean {
  const scoringType = incoming.scoringType ?? "LEVELS";
  if (existing.scoringType !== scoringType) return true;
  if (existing.allowMultipleViolations !== (incoming.allowMultipleViolations ?? false)) {
    return true;
  }
  if (existing.maxPoints !== incoming.maxPoints) return true;
  return (
    deductionOptionsFingerprint(existing.deductionOptions) !==
    deductionOptionsFingerprint(incoming.deductionOptions)
  );
}

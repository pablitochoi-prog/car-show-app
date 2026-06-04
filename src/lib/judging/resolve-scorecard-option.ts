type DeductionOptionLike = {
  id: string;
  label: string;
  pointsDeducted: number;
};

/** Resolve a level selection to a current sheet option (id match, then label, then unique points). */
export function resolveScorecardOptionForSelection(
  options: DeductionOptionLike[],
  selection: { optionId: string; label?: string; pointsDeducted?: number },
): DeductionOptionLike | undefined {
  const byId = options.find((o) => o.id === selection.optionId);
  if (byId) return byId;

  if (selection.label?.trim()) {
    const key = selection.label.trim().toLowerCase();
    const byLabel = options.find((o) => o.label.trim().toLowerCase() === key);
    if (byLabel) return byLabel;
  }

  if (selection.pointsDeducted != null) {
    const byPoints = options.filter(
      (o) => o.pointsDeducted === selection.pointsDeducted,
    );
    if (byPoints.length === 1) return byPoints[0];
  }

  return undefined;
}

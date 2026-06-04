/** Pick auto winner for place index, skipping excluded codes (list is highest-first). */
export function pickAutoWinnerForPlace(
  vehicles: { vehicleEntryCode: string }[],
  placeIndex: number,
  excluded: Set<string>,
): string | null {
  let slot = 0;
  for (const v of vehicles) {
    if (excluded.has(v.vehicleEntryCode)) continue;
    if (slot === placeIndex) return v.vehicleEntryCode;
    slot++;
  }
  return null;
}

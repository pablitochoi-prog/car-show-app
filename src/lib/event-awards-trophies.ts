/** Place labels for category trophies (1st through 10th). */
export const CATEGORY_PLACE_LABELS = [
  "1st Place",
  "2nd Place",
  "3rd Place",
  "4th Place",
  "5th Place",
  "6th Place",
  "7th Place",
  "8th Place",
  "9th Place",
  "10th Place",
] as const;

export type EventAwardTrophyKind = "category_place" | "special";

export type EventAwardTrophyEntry = {
  /** Stable id: `place:{eventCategoryId}:{placeIndex}` or `special:{eventAwardId}` */
  id: string;
  kind: EventAwardTrophyKind;
  label: string;
  eventCategoryId?: string;
  placeIndex?: number;
  eventAwardId?: string;
  categoryName?: string;
};

export function categoryPlaceEntryId(
  eventCategoryId: string,
  placeIndex: number,
): string {
  return `place:${eventCategoryId}:${placeIndex}`;
}

export function specialAwardEntryId(eventAwardId: string): string {
  return `special:${eventAwardId}`;
}

export function parseAwardTrophyEntryId(
  id: string,
):
  | { kind: "category_place"; eventCategoryId: string; placeIndex: number }
  | { kind: "special"; eventAwardId: string }
  | null {
  const placeMatch = id.match(/^place:([^:]+):(\d+)$/);
  if (placeMatch) {
    return {
      kind: "category_place",
      eventCategoryId: placeMatch[1],
      placeIndex: Number.parseInt(placeMatch[2], 10),
    };
  }
  const specialMatch = id.match(/^special:(.+)$/);
  if (specialMatch) {
    return { kind: "special", eventAwardId: specialMatch[1] };
  }
  return null;
}

export function buildCategoryPlaceLabel(
  categoryName: string,
  placeIndex: number,
): string {
  const place =
    CATEGORY_PLACE_LABELS[placeIndex] ??
    `${placeIndex + 1}${placeSuffix(placeIndex + 1)} Place`;
  return `Best ${categoryName} — ${place}`;
}

function placeSuffix(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  if (mod10 === 1) return "st";
  if (mod10 === 2) return "nd";
  if (mod10 === 3) return "rd";
  return "th";
}

export function buildEventAwardTrophyEntries(input: {
  categories: { id: string; name: string; trophyCount: number }[];
  specialAwards: { id: string; name: string }[];
}): EventAwardTrophyEntry[] {
  const entries: EventAwardTrophyEntry[] = [];

  for (const cat of input.categories) {
    const count = Math.min(
      Math.max(cat.trophyCount, 0),
      CATEGORY_PLACE_LABELS.length,
    );
    for (let i = 0; i < count; i++) {
      entries.push({
        id: categoryPlaceEntryId(cat.id, i),
        kind: "category_place",
        label: buildCategoryPlaceLabel(cat.name, i),
        eventCategoryId: cat.id,
        placeIndex: i,
        categoryName: cat.name,
      });
    }
  }

  for (const award of input.specialAwards) {
    entries.push({
      id: specialAwardEntryId(award.id),
      kind: "special",
      label: award.name,
      eventAwardId: award.id,
    });
  }

  return entries;
}

export function countEventAwardTrophies(input: {
  categories: { id: string; name: string; trophyCount: number }[];
  specialAwards: { id: string; name: string }[];
}): number {
  return buildEventAwardTrophyEntries(input).length;
}

/** Group category-place removals and compute new trophy counts per category. */
export function computeTrophyCountAfterRemovals(
  categories: { id: string; trophyCount: number }[],
  removedPlaceEntryIds: string[],
): Map<string, number> {
  const removalsByCategory = new Map<string, number>();

  for (const entryId of removedPlaceEntryIds) {
    const parsed = parseAwardTrophyEntryId(entryId);
    if (parsed?.kind !== "category_place") continue;
    removalsByCategory.set(
      parsed.eventCategoryId,
      (removalsByCategory.get(parsed.eventCategoryId) ?? 0) + 1,
    );
  }

  const next = new Map<string, number>();
  for (const cat of categories) {
    const removed = removalsByCategory.get(cat.id) ?? 0;
    next.set(cat.id, Math.max(1, cat.trophyCount - removed));
  }
  return next;
}

export const EVENT_CATEGORIES_CHANGED = "event-categories-changed";

export function notifyEventCategoriesChanged(eventId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EVENT_CATEGORIES_CHANGED, { detail: { eventId } }),
  );
}

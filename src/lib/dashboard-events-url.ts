export type EventsTab = "managing" | "participating";

const PAGE_SIZE = 18;

export function getEventsPageSize() {
  return PAGE_SIZE;
}

export function parseEventsTab(tab: string | string[] | undefined): EventsTab {
  const raw = Array.isArray(tab) ? tab[0] : tab;
  return raw === "participating" ? "participating" : "managing";
}

export function parseEventsPage(page: string | string[] | undefined): number {
  const raw = Array.isArray(page) ? page[0] : page;
  const n = parseInt(String(raw ?? "1"), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

/** Stable dashboard events URLs (omit defaults for cleaner links). */
export function hrefDashboardEvents(tab: EventsTab, page: number): string {
  const params = new URLSearchParams();
  if (tab === "participating") params.set("tab", "participating");
  if (page > 1) params.set("page", String(page));
  const q = params.toString();
  return `/dashboard/events${q ? `?${q}` : ""}`;
}

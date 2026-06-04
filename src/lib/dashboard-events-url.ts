export type EventsTab = "managing" | "participating";

const PAGE_SIZE = 18;

export function getEventsPageSize() {
  return PAGE_SIZE;
}

export function parseEventsTab(tab: string | string[] | undefined): EventsTab {
  const raw = Array.isArray(tab) ? tab[0] : tab;
  return raw === "managing" ? "managing" : "participating";
}

export function parseEventsPage(page: string | string[] | undefined): number {
  const raw = Array.isArray(page) ? page[0] : page;
  const n = parseInt(String(raw ?? "1"), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export function parseShowPastEvents(
  past: string | string[] | undefined,
): boolean {
  const raw = Array.isArray(past) ? past[0] : past;
  return raw === "1" || raw === "true";
}

export type DashboardEventsLinkOptions = {
  showPast?: boolean;
};

/** Stable dashboard events URLs (omit defaults for cleaner links). */
export function hrefDashboardEvents(
  tab: EventsTab,
  page: number,
  options?: DashboardEventsLinkOptions,
): string {
  const params = new URLSearchParams();
  if (tab === "managing") params.set("tab", "managing");
  if (tab === "participating" && options?.showPast) params.set("past", "1");
  if (page > 1) params.set("page", String(page));
  const q = params.toString();
  return `/dashboard/events${q ? `?${q}` : ""}`;
}

export type DashboardEventsFlash = "updated" | "created" | "archived" | "deleted";

/** My Events → Managing tab with a status flash (organizer/staff save flows). */
export function hrefDashboardEventsManagingFlash(flash: DashboardEventsFlash): string {
  const params = new URLSearchParams({ tab: "managing", [flash]: "1" });
  return `/dashboard/events?${params.toString()}`;
}

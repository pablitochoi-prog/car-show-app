/** 5 minutes — event setup data rarely changes while editing. */
export const EVENT_SETUP_STALE_MS = 5 * 60 * 1000;

export const eventApiKeys = {
  sponsor: (eventId: string) => `/api/events/${eventId}/sponsor`,
  charity: (eventId: string) => `/api/events/${eventId}/charity`,
  categories: (eventId: string) => `/api/events/${eventId}/categories`,
  availableCategories: (eventId: string) =>
    `/api/events/${eventId}/available-categories`,
  awards: (eventId: string) => `/api/events/${eventId}/awards`,
  masterAwards: () => "/api/awards",
} as const;

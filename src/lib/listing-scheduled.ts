import type { EventStatus } from "@prisma/client";

/** Persists listing go-live moment: draft clears, published stamps now, scheduled uses ISO from client. */
export function resolveListingScheduledAtForPersistence(params: {
  status: EventStatus;
  listingScheduledAtIso: string | null | undefined;
}): Date | null {
  if (params.status === "DRAFT") return null;
  if (params.status === "PUBLISHED") return new Date();
  const raw = params.listingScheduledAtIso;
  if (!raw?.trim()) return null;
  return new Date(raw);
}

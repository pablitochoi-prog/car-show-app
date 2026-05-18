import type { Prisma } from "@prisma/client";

export const EVENT_SHOW_NUMBER_PREFIX = "EVT-";
export const EVENT_SHOW_NUMBER_START = 1001;

/** Format a show number for display (e.g. 1001 → "EVT-1001"). */
export function formatEventShowNumber(showNumber: number): string {
  return `${EVENT_SHOW_NUMBER_PREFIX}${showNumber}`;
}

/** Allocate the next unique event show number (thread-safe via Postgres sequence). */
export async function allocateEventShowNumber(
  tx: Prisma.TransactionClient,
): Promise<number> {
  const rows = await tx.$queryRaw<{ nextval: bigint }[]>`
    SELECT nextval('event_show_number_seq')::bigint AS nextval
  `;
  const next = rows[0]?.nextval;
  if (next == null) {
    throw new Error("Failed to allocate event show number");
  }
  return Number(next);
}

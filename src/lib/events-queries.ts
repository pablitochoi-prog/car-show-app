import type { Prisma } from "@prisma/client";

export type EventListFilters = {
  q?: string;
  city?: string;
  state?: string;
  eventType?: string;
  from?: Date;
  to?: Date;
};

export function buildPublishedWhere(
  filters: EventListFilters
): Prisma.EventWhereInput {
  const where: Prisma.EventWhereInput = {
    status: { in: ["SCHEDULED", "PUBLISHED", "ACTIVE"] },
    orgId: { not: null },
  };

  if (filters.q?.trim()) {
    where.OR = [
      { name: { contains: filters.q.trim(), mode: "insensitive" } },
      { venue: { contains: filters.q.trim(), mode: "insensitive" } },
      { description: { contains: filters.q.trim(), mode: "insensitive" } },
    ];
  }

  if (filters.city?.trim()) {
    where.city = { contains: filters.city.trim(), mode: "insensitive" };
  }

  if (filters.state?.trim()) {
    where.state = { contains: filters.state.trim(), mode: "insensitive" };
  }

  if (filters.eventType?.trim()) {
    where.eventType = filters.eventType.trim();
  }

  const dateFilter: Prisma.DateTimeFilter = {};
  if (filters.from) dateFilter.gte = filters.from;
  if (filters.to) dateFilter.lte = filters.to;
  if (Object.keys(dateFilter).length > 0) {
    where.startDate = dateFilter;
  }

  return where;
}

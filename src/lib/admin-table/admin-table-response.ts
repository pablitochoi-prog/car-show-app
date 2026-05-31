import type { AdminTableMeta } from "./types";

export function adminTableMeta(
  total: number,
  page: number,
  pageSize: number,
): AdminTableMeta {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    total,
    page,
    pageSize,
    totalPages,
  };
}

export function adminTableSkip(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

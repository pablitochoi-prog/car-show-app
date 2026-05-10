import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  hrefDashboardEvents,
  type EventsTab,
} from "@/lib/dashboard-events-url";

export function EventsPaginationBar(props: {
  tab: EventsTab;
  page: number;
  pageSize: number;
  total: number;
}) {
  const { tab, page, pageSize, total } = props;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const show = total > pageSize;

  if (!show) return null;

  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">
          {from}–{to}
        </span>{" "}
        of <span className="font-medium text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        {prev ? (
          <Link
            href={hrefDashboardEvents(tab, prev)}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1"
            )}
          >
            <ChevronLeft className="size-3.5" aria-hidden />
            Previous
          </Link>
        ) : (
          <span
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "pointer-events-none opacity-40"
            )}
          >
            <ChevronLeft className="size-3.5" aria-hidden />
            Previous
          </span>
        )}
        <span className="px-2 text-xs tabular-nums text-muted-foreground">
          Page {page} / {totalPages}
        </span>
        {next ? (
          <Link
            href={hrefDashboardEvents(tab, next)}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1"
            )}
          >
            Next
            <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        ) : (
          <span
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "pointer-events-none opacity-40"
            )}
          >
            Next
            <ChevronRight className="size-3.5" aria-hidden />
          </span>
        )}
      </div>
    </div>
  );
}

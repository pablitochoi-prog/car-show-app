import { Loader2 } from "lucide-react";

export default function EventReportsLoading() {
  return (
    <div className="page-shell max-w-6xl space-y-6">
      <div className="h-4 w-24 animate-pulse rounded bg-muted" aria-hidden />
      <div className="h-10 animate-pulse rounded-lg border bg-muted/30" aria-hidden />
      <div
        className="flex min-h-[16rem] flex-col items-center justify-center gap-3 rounded-lg border bg-card py-16 text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="size-8 animate-spin" aria-hidden />
        <p className="text-sm">Loading report…</p>
      </div>
    </div>
  );
}

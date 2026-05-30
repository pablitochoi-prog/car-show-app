import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="page-shell flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}

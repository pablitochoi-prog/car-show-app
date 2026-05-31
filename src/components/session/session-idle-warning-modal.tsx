"use client";

import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  minutesRemaining: number;
  busy: boolean;
  onStayLoggedIn: () => void;
  onLogOut: () => void;
};

export function SessionIdleWarningModal({
  open,
  minutesRemaining,
  busy,
  onStayLoggedIn,
  onLogOut,
}: Props) {
  if (!open) return null;

  const mins = Math.max(1, Math.ceil(minutesRemaining));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-idle-title"
    >
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <h2 id="session-idle-title" className="text-lg font-semibold">
          Session expiring soon
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your session will expire in {mins} minute{mins === 1 ? "" : "s"} due to
          inactivity.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onLogOut}
          >
            Log Out Now
          </Button>
          <Button type="button" disabled={busy} onClick={onStayLoggedIn}>
            Stay Logged In
          </Button>
        </div>
      </div>
    </div>
  );
}

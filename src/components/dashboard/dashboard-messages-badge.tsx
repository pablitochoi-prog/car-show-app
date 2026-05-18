"use client";

import { useUnreadMessages } from "@/components/messages/unread-messages-provider";
import { UnreadCountBadge } from "@/components/messages/unread-count-badge";
import { cn } from "@/lib/utils";

export function DashboardMessagesBadge({ onPrimary = false }: { onPrimary?: boolean }) {
  const { unreadCount } = useUnreadMessages();
  if (unreadCount <= 0) return null;

  return (
    <span className="inline-flex items-center gap-1">
      <UnreadCountBadge count={unreadCount} onPrimary={onPrimary} />
      <span
        className={cn(
          "text-[11px] font-medium tabular-nums",
          onPrimary ? "text-primary-foreground/90" : "text-muted-foreground",
        )}
      >
        new
      </span>
    </span>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { useUnreadMessages } from "@/components/messages/unread-messages-provider";
import { DashboardMessagesBadge } from "@/components/dashboard/dashboard-messages-badge";
import { NavTileLink } from "@/components/navigation/nav-tile-link";

export function DashboardMessagesTile() {
  const { unreadCount } = useUnreadMessages();
  const hasUnread = unreadCount > 0;

  return (
    <NavTileLink
      href="/dashboard/messages"
      title="My Messages"
      description="Messages between you and event organizers."
      icon="message-square"
      titleExtra={<DashboardMessagesBadge />}
      className={cn(
        hasUnread &&
          "border-primary/50 bg-primary/10 ring-1 ring-primary/20 hover:border-primary hover:bg-primary/15",
      )}
    />
  );
}

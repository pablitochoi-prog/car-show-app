"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadMessages } from "@/components/messages/unread-messages-provider";
import { DashboardMessagesBadge } from "@/components/dashboard/dashboard-messages-badge";

export function DashboardMessagesTile() {
  const { unreadCount } = useUnreadMessages();
  const hasUnread = unreadCount > 0;

  return (
    <Link
      href="/dashboard/messages"
      className={cn(
        "flex flex-col rounded-xl border p-6 text-card-foreground shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        hasUnread
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
          : "border-border bg-card hover:bg-accent/45 hover:border-primary/35",
      )}
    >
      <div className="flex flex-row items-start gap-3">
        <MessageSquare
          className={cn(
            "mt-0.5 h-6 w-6 shrink-0",
            hasUnread ? "text-primary-foreground" : "text-primary",
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold leading-snug tracking-tight">
              My Messages
            </h2>
            <DashboardMessagesBadge onPrimary={hasUnread} />
          </div>
          <p
            className={cn(
              "text-sm leading-relaxed",
              hasUnread ? "text-primary-foreground/85" : "text-muted-foreground",
            )}
          >
            Messages between you and event organizers.
          </p>
        </div>
      </div>
    </Link>
  );
}

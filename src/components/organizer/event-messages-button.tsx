"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { UnreadCountBadge } from "@/components/messages/unread-count-badge";
import { cn } from "@/lib/utils";

export function EventMessagesButton({
  eventId,
  initialUnreadCount = 0,
  className,
}: {
  eventId: string;
  initialUnreadCount?: number;
  className?: string;
}) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const hasUnread = unreadCount > 0;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/messages/unread-count`, {
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { count?: number };
      if (typeof data.count === "number") {
        setUnreadCount(data.count);
      }
    } catch {
      // ignore polling errors
    }
  }, [eventId]);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  return (
    <Link
      href={`/organizer/events/${eventId}/messages`}
      className={cn(
        buttonVariants({
          variant: hasUnread ? "default" : "outline",
          size: "sm",
        }),
        "inline-flex items-center gap-1.5 no-underline",
        !hasUnread && "bg-background",
        className,
      )}
    >
      <Mail className="size-4 shrink-0" aria-hidden />
      Event Messages
      <UnreadCountBadge count={unreadCount} onPrimary={hasUnread} />
    </Link>
  );
}

"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatEventShowNumber } from "@/lib/event-show-number";
import { Mail, MailOpen, AlertTriangle, Clock, Loader2 } from "lucide-react";

export type MessageRow = {
  id: string;
  type: string;
  subject: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  mailboxArchivedAt?: string | null;
  sender: { id: string; name: string; email: string } | null;
  recipient: { id: string; name: string; email: string } | null;
  event: { id: string; name: string; showNumber: number } | null;
  organization: { id: string; name: string } | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MessageList({
  messages,
  currentUserId,
  onToggleRead,
}: {
  messages: MessageRow[];
  currentUserId: string;
  onToggleRead?: (id: string, read: boolean) => void | Promise<void>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  if (messages.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-12 text-center">
        <Mail className="mx-auto mb-3 size-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No messages yet.</p>
      </div>
    );
  }

  async function handleToggleRead(
    e: React.MouseEvent,
    msg: MessageRow,
    read: boolean,
  ) {
    e.stopPropagation();
    if (!onToggleRead) return;
    setTogglingId(msg.id);
    try {
      await onToggleRead(msg.id, read);
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <ul className="divide-y divide-border rounded-lg border">
      {messages.map((msg) => {
        const isExpanded = expandedId === msg.id;
        const isSent = msg.sender?.id === currentUserId;
        const isInbox = msg.recipient?.id === currentUserId;
        const isUnread = !msg.readAt && isInbox;
        const canToggleRead = isInbox && !!onToggleRead;

        return (
          <li key={msg.id} className="px-4 py-3">
            <button
              type="button"
              className="flex w-full items-start gap-3 text-left"
              onClick={() => setExpandedId(isExpanded ? null : msg.id)}
            >
              <div className="mt-0.5 shrink-0">
                {msg.type === "REFUND_REQUEST" ? (
                  <AlertTriangle className="size-4 text-amber-500" />
                ) : isUnread ? (
                  <Mail className="size-4 text-primary" />
                ) : (
                  <MailOpen className="size-4 text-muted-foreground" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`truncate text-sm ${isUnread ? "font-semibold" : "font-medium"}`}
                  >
                    {msg.subject}
                  </span>
                  {msg.type === "REFUND_REQUEST" && (
                    <Badge variant="warning">Refund Request</Badge>
                  )}
                  {isUnread && <Badge variant="default">New</Badge>}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <span>
                    {isSent ? "To" : "From"}:{" "}
                    {isSent
                      ? msg.recipient?.name ?? "Event Organizer"
                      : msg.sender?.name ?? "System"}
                  </span>
                  {msg.event && (
                    <span>
                      {formatEventShowNumber(msg.event.showNumber)}{" "}
                      {msg.event.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatDate(msg.createdAt)}
                  </span>
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="mt-3 ml-7 space-y-3 rounded-md border bg-muted/20 p-3">
                <p className="whitespace-pre-wrap text-sm">{msg.body}</p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {msg.readAt && isInbox && (
                      <span>Read {formatDate(msg.readAt)}</span>
                    )}
                    {msg.organization && (
                      <span>Org: {msg.organization.name}</span>
                    )}
                  </div>
                  {canToggleRead && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={togglingId === msg.id}
                      onClick={(e) =>
                        void handleToggleRead(e, msg, !msg.readAt)
                      }
                    >
                      {togglingId === msg.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : msg.readAt ? (
                        "Mark as unread"
                      ) : (
                        "Mark as read"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

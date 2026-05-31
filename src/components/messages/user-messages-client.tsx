"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { MessageRow } from "./message-list";
import { UserMessagesInbox } from "./user-messages-inbox";
import { ComposeMessageDialog } from "./compose-message-dialog";
import { Plus } from "lucide-react";
import { useUnreadMessages } from "@/components/messages/unread-messages-provider";
import {
  type ComposeDraft,
  buildForwardDraft,
  buildReplyAllDraft,
  buildReplyDraft,
} from "@/lib/message-compose-draft";

const emptyCompose: ComposeDraft = { title: "New Message", subject: "", body: "" };

export function UserMessagesClient({
  initialMessages,
  currentUserId,
}: {
  initialMessages: MessageRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const { refreshUnreadCount, setUnreadCount } = useUnreadMessages();
  const [messages, setMessages] = useState(initialMessages);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeDefaults, setComposeDefaults] = useState<ComposeDraft>(emptyCompose);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  async function handleMarkRead(id: string) {
    const res = await fetch(`/api/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    if (!res.ok) return;

    const updated = (await res.json()) as { readAt: string | null };
    const readAt = updated.readAt ?? new Date().toISOString();
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, readAt } : m)),
    );
    await refreshUnreadCount({ force: true });
  }

  async function handleBulkAction(
    ids: string[],
    action: "read" | "unread" | "delete" | "archive" | "unarchive",
  ) {
    setBusy(true);
    try {
      const res = await fetch("/api/messages/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });
      if (!res.ok) return;

      const payload = (await res.json()) as { unreadCount?: number };
      if (typeof payload.unreadCount === "number") {
        setUnreadCount(payload.unreadCount);
      } else if (action === "read" || action === "unread") {
        await refreshUnreadCount({ force: true });
      }

      const now = new Date().toISOString();
      setMessages((prev) => {
        let next = [...prev];
        if (action === "delete") {
          next = next.filter((m) => !ids.includes(m.id));
        } else if (action === "archive") {
          next = next.map((m) =>
            ids.includes(m.id) ? { ...m, mailboxArchivedAt: now } : m,
          );
        } else if (action === "unarchive") {
          next = next.map((m) =>
            ids.includes(m.id) ? { ...m, mailboxArchivedAt: null } : m,
          );
        } else if (action === "read" || action === "unread") {
          next = next.map((m) =>
            ids.includes(m.id) && m.recipient?.id === currentUserId
              ? { ...m, readAt: action === "read" ? now : null }
              : m,
          );
        }
        return next;
      });
      if (
        typeof payload.unreadCount !== "number" &&
        (action === "delete" || action === "archive" || action === "unarchive")
      ) {
        await refreshUnreadCount({ force: true });
      }
      if (action === "delete" || action === "archive" || action === "unarchive") {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  function openCompose(draft: ComposeDraft) {
    setComposeDefaults(draft);
    setComposeOpen(true);
  }

  function handleForward(msg: MessageRow) {
    openCompose(buildForwardDraft(msg, currentUserId));
  }

  function handleReply(msg: MessageRow) {
    openCompose(buildReplyDraft(msg, currentUserId));
  }

  function handleReplyAll(msg: MessageRow) {
    openCompose(buildReplyAllDraft(msg, currentUserId));
  }

  function openNewMessage() {
    openCompose(emptyCompose);
  }

  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" className="gap-1" onClick={openNewMessage}>
          <Plus className="size-4" />
          New Message
        </Button>
      </div>

      <UserMessagesInbox
        messages={messages}
        currentUserId={currentUserId}
        busy={busy}
        onBulkAction={handleBulkAction}
        onMarkRead={handleMarkRead}
        onForward={handleForward}
        onReply={handleReply}
        onReplyAll={handleReplyAll}
      />

      <ComposeMessageDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        title={composeDefaults.title}
        eventId={composeDefaults.eventId}
        eventLabel={composeDefaults.eventLabel}
        recipientUserId={composeDefaults.recipientUserId}
        recipientHint={composeDefaults.recipientHint}
        initialSubject={composeDefaults.subject}
        initialBody={composeDefaults.body}
        onSent={() => {
          setComposeOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

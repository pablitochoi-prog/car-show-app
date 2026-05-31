"use client";

import { useCallback, useState } from "react";
import { MessageList, type MessageRow } from "./message-list";

export function OrganizerMessagesClient({
  initialMessages,
  currentUserId,
}: {
  initialMessages: MessageRow[];
  currentUserId: string;
}) {
  const [messages, setMessages] = useState(initialMessages);

  const onToggleRead = useCallback(async (id: string, read: boolean) => {
    const res = await fetch(`/api/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ read }),
    });
    if (!res.ok) return;
    const now = read ? new Date().toISOString() : null;
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, readAt: now } : m)),
    );
  }, []);

  return (
    <MessageList
      messages={messages}
      currentUserId={currentUserId}
      onToggleRead={onToggleRead}
    />
  );
}

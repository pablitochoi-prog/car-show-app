"use client";

import { MessageList, type MessageRow } from "./message-list";

export function AdminMessagesClient({
  initialMessages,
  currentUserId,
}: {
  initialMessages: MessageRow[];
  currentUserId: string;
}) {
  return (
    <MessageList
      messages={initialMessages}
      currentUserId={currentUserId}
    />
  );
}

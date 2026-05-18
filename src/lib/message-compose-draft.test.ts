import { describe, expect, it } from "vitest";
import {
  buildReplyAllDraft,
  buildReplyDraft,
} from "@/lib/message-compose-draft";
import type { MessageRow } from "@/components/messages/message-list";

const baseMsg: MessageRow = {
  id: "1",
  type: "GENERAL",
  subject: "Hello",
  body: "Body text",
  createdAt: "2026-05-16T12:00:00.000Z",
  readAt: null,
  sender: { id: "org-1", name: "Organizer", email: "o@test.com" },
  recipient: { id: "user-1", name: "User", email: "u@test.com" },
  event: { id: "evt-1", name: "Car Show", showNumber: 1001 },
  organization: null,
};

describe("message-compose-draft", () => {
  it("reply targets the sender for received messages", () => {
    const draft = buildReplyDraft(baseMsg, "user-1");
    expect(draft.recipientUserId).toBe("org-1");
    expect(draft.subject).toBe("Re: Hello");
  });

  it("reply all fans out when an event is linked", () => {
    const draft = buildReplyAllDraft(baseMsg, "user-1");
    expect(draft.eventId).toBe("evt-1");
    expect(draft.recipientUserId).toBeUndefined();
  });
});

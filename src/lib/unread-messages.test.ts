import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    message: { count: vi.fn() },
  },
}));

vi.mock("@/lib/message-mailbox", () => ({
  userUnreadMessageWhere: vi.fn(() => ({ recipientUserId: "u1", readAt: null })),
  userUnreadMessageForEventWhere: vi.fn(() => ({
    recipientUserId: "u1",
    eventId: "e1",
    readAt: null,
  })),
}));

import { prisma } from "@/lib/db";
import {
  countUnreadMessagesForUser,
  countUnreadMessagesForUserAndEvent,
} from "@/lib/unread-messages";

describe("unread-messages", () => {
  beforeEach(() => {
    vi.mocked(prisma.message.count).mockReset();
  });

  it("returns 0 on Prisma P2024 pool timeout instead of throwing", async () => {
    const p2024 = new Prisma.PrismaClientKnownRequestError(
      "Timed out fetching a new connection from the connection pool.",
      { code: "P2024", clientVersion: "test" },
    );
    vi.mocked(prisma.message.count).mockRejectedValue(p2024);

    await expect(countUnreadMessagesForUser("user-1")).resolves.toBe(0);
    await expect(
      countUnreadMessagesForUserAndEvent("user-1", "event-1"),
    ).resolves.toBe(0);
  });

  it("rethrows non-P2024 errors", async () => {
    vi.mocked(prisma.message.count).mockRejectedValue(new Error("db down"));

    await expect(countUnreadMessagesForUser("user-1")).rejects.toThrow(
      "db down",
    );
  });
});

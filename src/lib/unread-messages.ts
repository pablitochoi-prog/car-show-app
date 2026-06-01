import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  userUnreadMessageForEventWhere,
  userUnreadMessageWhere,
} from "@/lib/message-mailbox";

async function safeMessageCount(countFn: () => Promise<number>): Promise<number> {
  try {
    return await countFn();
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2024"
    ) {
      console.warn(
        "[unread-messages] DB connection pool timeout — returning 0",
      );
      return 0;
    }
    throw err;
  }
}

/** Messages in the current user’s inbox that have not been marked read. */
export async function countUnreadMessagesForUser(userId: string): Promise<number> {
  return safeMessageCount(() =>
    prisma.message.count({
      where: userUnreadMessageWhere(userId),
    }),
  );
}

/** Unread inbox messages for one event (organizer view). */
export async function countUnreadMessagesForUserAndEvent(
  userId: string,
  eventId: string,
): Promise<number> {
  return safeMessageCount(() =>
    prisma.message.count({
      where: userUnreadMessageForEventWhere(userId, eventId),
    }),
  );
}

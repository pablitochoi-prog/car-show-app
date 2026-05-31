import { prisma } from "@/lib/db";
import {
  userUnreadMessageForEventWhere,
  userUnreadMessageWhere,
} from "@/lib/message-mailbox";

/** Messages in the current user’s inbox that have not been marked read. */
export async function countUnreadMessagesForUser(userId: string): Promise<number> {
  return prisma.message.count({
    where: userUnreadMessageWhere(userId),
  });
}

/** Unread inbox messages for one event (organizer view). */
export async function countUnreadMessagesForUserAndEvent(
  userId: string,
  eventId: string,
): Promise<number> {
  return prisma.message.count({
    where: userUnreadMessageForEventWhere(userId, eventId),
  });
}

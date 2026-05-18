import { prisma } from "@/lib/db";
import { userUnreadMessageWhere } from "@/lib/message-mailbox";

/** Messages in the current user’s inbox that have not been marked read. */
export async function countUnreadMessagesForUser(userId: string): Promise<number> {
  return prisma.message.count({
    where: userUnreadMessageWhere(userId),
  });
}

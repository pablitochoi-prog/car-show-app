import type { Prisma } from "@prisma/client";

/** Messages visible in the user’s mailbox (not soft-deleted for them). */
export function userMailboxMessageWhere(userId: string): Prisma.MessageWhereInput {
  return {
    OR: [{ senderUserId: userId }, { recipientUserId: userId }],
    NOT: {
      userStates: {
        some: {
          userId,
          deletedAt: { not: null },
        },
      },
    },
  };
}

/** Unread count: inbox only (not archived or deleted for this user). */
export function userUnreadMessageWhere(userId: string): Prisma.MessageWhereInput {
  return {
    recipientUserId: userId,
    readAt: null,
    NOT: {
      userStates: {
        some: {
          userId,
          OR: [{ deletedAt: { not: null } }, { archivedAt: { not: null } }],
        },
      },
    },
  };
}

/** Unread inbox count for one event (organizer event messages screen). */
export function userUnreadMessageForEventWhere(
  userId: string,
  eventId: string,
): Prisma.MessageWhereInput {
  return {
    ...userUnreadMessageWhere(userId),
    eventId,
  };
}

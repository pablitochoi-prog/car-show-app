import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, writeAccessDeniedResponse } from "@/lib/auth";
import { countUnreadMessagesForUser } from "@/lib/unread-messages";

type BulkAction = "read" | "unread" | "delete" | "archive" | "unarchive";

/** POST /api/messages/bulk — bulk read / unread / delete / archive for the current user. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const writeDenied = writeAccessDeniedResponse(user);
  if (writeDenied) return writeDenied;

  const body = (await request.json()) as {
    ids?: string[];
    action?: BulkAction;
  };

  const ids = Array.isArray(body.ids) ? [...new Set(body.ids)] : [];
  const action = body.action;

  if (ids.length === 0 || !action) {
    return NextResponse.json(
      { error: "Message ids and action are required." },
      { status: 400 },
    );
  }

  if (!["read", "unread", "delete", "archive", "unarchive"].includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const messages = await prisma.message.findMany({
    where: {
      id: { in: ids },
      OR: [{ senderUserId: user.id }, { recipientUserId: user.id }],
    },
    select: { id: true, recipientUserId: true },
  });

  if (messages.length !== ids.length) {
    return NextResponse.json(
      { error: "One or more messages were not found." },
      { status: 404 },
    );
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    if (action === "read" || action === "unread") {
      const recipientIds = messages
        .filter((m) => m.recipientUserId === user.id)
        .map((m) => m.id);
      if (recipientIds.length > 0) {
        await tx.message.updateMany({
          where: { id: { in: recipientIds } },
          data: { readAt: action === "read" ? now : null },
        });
      }
    }

    if (action === "delete" || action === "archive" || action === "unarchive") {
      for (const { id: messageId } of messages) {
        if (action === "unarchive") {
          await tx.messageUserState.upsert({
            where: {
              userId_messageId: { userId: user.id, messageId },
            },
            create: {
              userId: user.id,
              messageId,
              archivedAt: null,
            },
            update: { archivedAt: null },
          });
          continue;
        }
        await tx.messageUserState.upsert({
          where: {
            userId_messageId: { userId: user.id, messageId },
          },
          create: {
            userId: user.id,
            messageId,
            deletedAt: action === "delete" ? now : null,
            archivedAt: action === "archive" ? now : null,
          },
          update: {
            deletedAt: action === "delete" ? now : undefined,
            archivedAt: action === "archive" ? now : undefined,
          },
        });
      }
    }
  });

  const unreadCount = await countUnreadMessagesForUser(user.id);

  return NextResponse.json({
    ok: true,
    affected: messages.length,
    unreadCount,
  });
}

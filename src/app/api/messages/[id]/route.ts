import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";

type RouteParams = { params: Promise<{ id: string }> };

/** PATCH /api/messages/:id — mark as read or unread (`{ read: boolean }`). */
export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let read = true;
  try {
    const body = (await request.json()) as { read?: boolean };
    if (typeof body.read === "boolean") {
      read = body.read;
    }
  } catch {
    // empty body: default to mark read (legacy clients)
  }

  const message = await prisma.message.findUnique({
    where: { id },
    select: { recipientUserId: true, senderUserId: true },
  });

  if (!message) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = isSiteAdmin(user);
  const isRecipient = message.recipientUserId === user.id;
  const isParticipant =
    isRecipient || message.senderUserId === user.id;

  if (!isParticipant && !admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!read && !isRecipient && !admin) {
    return NextResponse.json(
      { error: "Only the recipient can mark a message as unread." },
      { status: 403 },
    );
  }

  const updated = await prisma.message.update({
    where: { id },
    data: { readAt: read ? new Date() : null },
  });

  return NextResponse.json({
    ...updated,
    readAt: updated.readAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
  });
}

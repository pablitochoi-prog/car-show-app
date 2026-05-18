import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, writeAccessDeniedResponse } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import { canManageEventRegistrations } from "@/lib/organizer-registrations-auth";
import { getSiteAdminUserIds } from "@/lib/site-admin-users";

/** GET /api/messages — list messages for the current user (sent + received). */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const type = searchParams.get("type");
  const role = searchParams.get("role"); // "organizer" | "admin"

  const admin = isSiteAdmin(user);

  // Build OR conditions for recipient
  const orConditions: object[] = [
    { senderUserId: user.id },
    { recipientUserId: user.id },
  ];

  // Organizers see messages for events they manage
  if (role === "organizer" && eventId) {
    orConditions.push({ eventId });
  }

  // Admins see all messages
  if (role === "admin" && admin) {
    orConditions.push({ recipientUserId: null });
    // For admin view, return all messages
    const where: Record<string, unknown> = {};
    if (eventId) where.eventId = eventId;
    if (type) where.type = type;

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: { select: { id: true, name: true, email: true } },
        recipient: { select: { id: true, name: true, email: true } },
        event: { select: { id: true, name: true, showNumber: true } },
        organization: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(messages);
  }

  const where: Record<string, unknown> = { OR: orConditions };
  if (eventId) where.eventId = eventId;
  if (type) where.type = type;

  const messages = await prisma.message.findMany({
    where,
    include: {
      sender: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
      event: { select: { id: true, name: true, showNumber: true } },
      organization: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(messages);
}

/** POST /api/messages — create a new message. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const writeDenied = writeAccessDeniedResponse(user);
  if (writeDenied) return writeDenied;

  const body = await request.json();
  const {
    subject,
    messageBody,
    eventId,
    orgId,
    recipientUserId,
    recipientUserIds,
    type,
    notifySiteAdmins,
  } = body as {
    subject?: string;
    messageBody?: string;
    eventId?: string;
    orgId?: string;
    recipientUserId?: string;
    recipientUserIds?: string[];
    type?: string;
    notifySiteAdmins?: boolean;
  };

  if (!subject?.trim() || !messageBody?.trim()) {
    return NextResponse.json(
      { error: "Subject and message are required." },
      { status: 400 },
    );
  }

  if (notifySiteAdmins && eventId) {
    const canNotify = await canManageEventRegistrations(
      user.id,
      eventId,
      user.platformRole,
    );
    if (!canNotify) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminIds = await getSiteAdminUserIds();
    if (adminIds.length === 0) {
      return NextResponse.json(
        { error: "No site administrators are configured." },
        { status: 400 },
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { orgId: true },
    });

    const messages = await prisma.$transaction(
      adminIds.map((recipientUserId) =>
        prisma.message.create({
          data: {
            type: "GENERAL",
            subject: subject.trim(),
            body: messageBody.trim(),
            senderUserId: user.id,
            recipientUserId,
            eventId,
            orgId: event?.orgId ?? orgId ?? null,
          },
        }),
      ),
    );

    return NextResponse.json({ messages }, { status: 201 });
  }

  const registrantIds = Array.isArray(recipientUserIds)
    ? [...new Set(recipientUserIds.filter((id): id is string => typeof id === "string" && id.length > 0))]
    : [];

  if (registrantIds.length > 0 && eventId) {
    const canMessage = await canManageEventRegistrations(
      user.id,
      eventId,
      user.platformRole,
    );
    if (!canMessage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { orgId: true },
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const registrations = await prisma.registration.findMany({
      where: { eventId, userId: { in: registrantIds } },
      select: { userId: true },
    });
    const validRecipientIds = [
      ...new Set(
        registrations
          .map((r) => r.userId)
          .filter((id): id is string => typeof id === "string"),
      ),
    ];

    if (validRecipientIds.length !== registrantIds.length) {
      return NextResponse.json(
        { error: "One or more recipients are not registrants for this event." },
        { status: 400 },
      );
    }

    const subjectTrimmed = subject.trim();
    const bodyTrimmed = messageBody.trim();
    const messages = await prisma.$transaction(
      validRecipientIds.map((recipientUserId) =>
        prisma.message.create({
          data: {
            type: "GENERAL",
            subject: subjectTrimmed,
            body: bodyTrimmed,
            senderUserId: user.id,
            recipientUserId,
            eventId,
            orgId: event.orgId,
          },
        }),
      ),
    );

    return NextResponse.json({ messages }, { status: 201 });
  }

  // If eventId provided but no recipientUserId, message every staff member with the organizer role
  let resolvedRecipient = recipientUserId ?? null;
  let resolvedOrgId = orgId ?? null;

  if (eventId && !resolvedRecipient) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        orgId: true,
        staffMembers: {
          where: {
            roleLinks: { some: { role: { slug: "organizer" } } },
          },
          select: { userId: true },
        },
      },
    });
    if (event) {
      resolvedOrgId = resolvedOrgId ?? event.orgId;
      const organizerUserIds = [
        ...new Set(event.staffMembers.map((m) => m.userId)),
      ];
      if (organizerUserIds.length > 0) {
        const msgType = type === "REFUND_REQUEST" ? "REFUND_REQUEST" : "GENERAL";
        const subjectTrimmed = subject.trim();
        const bodyTrimmed = messageBody.trim();
        const messages = await prisma.$transaction(
          organizerUserIds.map((recipientUserId) =>
            prisma.message.create({
              data: {
                type: msgType,
                subject: subjectTrimmed,
                body: bodyTrimmed,
                senderUserId: user.id,
                recipientUserId,
                eventId,
                orgId: resolvedOrgId,
              },
            }),
          ),
        );
        return NextResponse.json({ messages }, { status: 201 });
      }
    }
  }

  const message = await prisma.message.create({
    data: {
      type: type === "REFUND_REQUEST" ? "REFUND_REQUEST" : "GENERAL",
      subject: subject.trim(),
      body: messageBody.trim(),
      senderUserId: user.id,
      recipientUserId: resolvedRecipient,
      eventId: eventId ?? null,
      orgId: resolvedOrgId,
    },
  });

  return NextResponse.json(message, { status: 201 });
}

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const admin = await getCurrentUser();
  if (!admin || !isSiteAdmin(admin))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      phone: true,
      street: true,
      city: true,
      state: true,
      zip: true,
      birthYear: true,
      platformRole: true,
      status: true,
      statusReason: true,
      statusChangedAt: true,
      archivedAt: true,
      createdAt: true,
      _count: {
        select: {
          vehicles: true,
          registrations: true,
          sentMessages: true,
          receivedMessages: true,
          orgMemberships: true,
          eventStaffMembers: true,
        },
      },
      registrations: {
        take: 8,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
          event: { select: { id: true, name: true, showNumber: true } },
          tier: { select: { name: true } },
        },
      },
      orgMemberships: {
        select: {
          role: true,
          organization: { select: { id: true, name: true } },
        },
      },
      eventStaffMembers: {
        select: {
          event: { select: { id: true, name: true, showNumber: true } },
          roleLinks: {
            select: { role: { select: { name: true, slug: true } } },
          },
        },
      },
    },
  });

  if (!target)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderUserId: id }, { recipientUserId: id }],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      type: true,
      subject: true,
      body: true,
      createdAt: true,
      readAt: true,
      sender: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
      event: { select: { id: true, name: true, showNumber: true } },
    },
  });

  return NextResponse.json({
    user: {
      ...target,
      statusChangedAt: target.statusChangedAt?.toISOString() ?? null,
      archivedAt: target.archivedAt?.toISOString() ?? null,
      createdAt: target.createdAt.toISOString(),
      registrations: target.registrations.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    },
    messages: messages.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      readAt: m.readAt?.toISOString() ?? null,
    })),
  });
}

import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

const deleteBodySchema = z.object({
  reassignToUserId: z.string().uuid(),
});

/** Preview assets that must be reassigned before delete. */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const admin = await getCurrentUser();
  if (!admin || !isSiteAdmin(admin))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (id === admin.id)
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      platformRole: true,
      eventStaffMembers: {
        select: {
          id: true,
          event: { select: { id: true, name: true, showNumber: true } },
          roleLinks: { select: { role: { select: { slug: true, name: true } } } },
        },
      },
      registrations: {
        where: { status: { not: "CANCELLED" } },
        select: {
          id: true,
          event: { select: { id: true, name: true, showNumber: true } },
        },
      },
      vehicles: {
        where: { archivedAt: null },
        select: { id: true, year: true, make: true, model: true },
      },
      orgMemberships: {
        select: { organization: { select: { id: true, name: true } } },
      },
    },
  });

  if (!target)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    user: {
      id: target.id,
      name: [target.firstName, target.lastName].filter(Boolean).join(" ") || target.email,
      email: target.email,
      platformRole: target.platformRole,
    },
    eventStaff: target.eventStaffMembers.map((s) => ({
      id: s.id,
      eventId: s.event.id,
      eventName: s.event.name,
      showNumber: s.event.showNumber,
      roles: s.roleLinks.map((l) => l.role.name),
    })),
    registrations: target.registrations,
    vehicles: target.vehicles,
    orgMemberships: target.orgMemberships.map((m) => m.organization),
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const admin = await getCurrentUser();
  if (!admin || !isSiteAdmin(admin))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (id === admin.id)
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = deleteBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "reassignToUserId is required" }, { status: 400 });
  }

  const { reassignToUserId } = parsed.data;
  if (reassignToUserId === id)
    return NextResponse.json(
      { error: "Cannot reassign to the same user being deleted" },
      { status: 400 },
    );

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, platformRole: true },
  });
  if (!target)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const assignee = await prisma.user.findUnique({
    where: { id: reassignToUserId },
    select: { id: true, status: true },
  });
  if (!assignee)
    return NextResponse.json({ error: "Reassignment user not found" }, { status: 400 });
  if (assignee.status === "BANNED")
    return NextResponse.json(
      { error: "Cannot reassign to a banned user" },
      { status: 400 },
    );

  await prisma.$transaction(async (tx) => {
    const staffRows = await tx.eventStaffMember.findMany({
      where: { userId: id },
      select: { id: true, eventId: true },
    });
    for (const row of staffRows) {
      const conflict = await tx.eventStaffMember.findUnique({
        where: {
          eventId_userId: { eventId: row.eventId, userId: reassignToUserId },
        },
      });
      if (conflict) {
        await tx.eventStaffMember.delete({ where: { id: row.id } });
      } else {
        await tx.eventStaffMember.update({
          where: { id: row.id },
          data: { userId: reassignToUserId },
        });
      }
    }

    const regRows = await tx.registration.findMany({
      where: { userId: id },
      select: { id: true, eventId: true },
    });
    for (const row of regRows) {
      const conflict = await tx.registration.findUnique({
        where: {
          eventId_userId: { eventId: row.eventId, userId: reassignToUserId },
        },
      });
      if (conflict) {
        await tx.registration.update({
          where: { id: row.id },
          data: { status: "CANCELLED" },
        });
      } else {
        await tx.registration.update({
          where: { id: row.id },
          data: { userId: reassignToUserId },
        });
      }
    }

    await tx.vehicle.updateMany({
      where: { userId: id },
      data: { userId: reassignToUserId },
    });

    await tx.organizationMember.deleteMany({
      where: { userId: id },
    });

    await tx.user.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}

import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import {
  createCustomEventRole,
  getUserEventRoles,
  listEventRoleDefinitions,
} from "@/lib/event-staff";
import { prisma } from "@/lib/db";
import { canAssignEventStaff } from "@/lib/permissions";
import { postCustomRoleBodySchema } from "@/lib/validation/event-staff";

type Ctx = { params: Promise<{ id: string }> };

async function authorizeStaffManagement(
  eventId: string,
  userId: string,
  platformRole: string,
) {
  const callerRoles = await getUserEventRoles(userId, eventId);
  return canAssignEventStaff(
    { platformRole: platformRole as "USER" | "ORGANIZER" | "ADMIN" },
    callerRoles,
  );
}

/** GET — role definitions for this event (defaults ensured). */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await ctx.params;

  const allowed = await authorizeStaffManagement(eventId, user.id, user.platformRole);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden: organizer or admin required" }, { status: 403 });
  }

  const roles = await listEventRoleDefinitions(eventId);
  return NextResponse.json({ roles });
}

/** POST — create a custom role name for this event only */
export async function POST(req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await ctx.params;

  const allowed = await authorizeStaffManagement(eventId, user.id, user.platformRole);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden: organizer or admin required" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postCustomRoleBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const name = parsed.data.name.trim();

  const dup = await prisma.eventRoleDefinition.findFirst({
    where: {
      eventId,
      name: { equals: name, mode: "insensitive" },
    },
  });
  if (dup) {
    return NextResponse.json(
      { error: "A role with that name already exists for this event." },
      { status: 409 },
    );
  }

  try {
    const role = await createCustomEventRole(eventId, name);
    const roles = await listEventRoleDefinitions(eventId);
    return NextResponse.json({ role, roles }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "A role with that name already exists for this event." },
        { status: 409 },
      );
    }
    throw e;
  }
}

import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserEventRoles } from "@/lib/event-staff";
import {
  assertRoleIdsBelongToEvent,
  findUserByEmail,
  getEventStaffList,
  removeStaffMember,
  updateUserStaffContact,
  upsertStaffMemberWithRoles,
} from "@/lib/event-staff";
import { canAssignEventStaff } from "@/lib/permissions";
import {
  patchEventStaffBodySchema,
  postEventStaffBodySchema,
} from "@/lib/validation/event-staff";
import { digitsFromPhoneInput } from "@/lib/phone-us";

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

export async function GET(_req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await ctx.params;

  const allowed = await authorizeStaffManagement(eventId, user.id, user.platformRole);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden: organizer or admin required" }, { status: 403 });
  }

  const staff = await getEventStaffList(eventId);
  return NextResponse.json(staff);
}

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

  const parsed = postEventStaffBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email, firstName, lastName, phone, roleIds } = parsed.data;

  const target = await findUserByEmail(email);
  if (!target) {
    return NextResponse.json(
      { error: "No user found with that email address. They must create an account first." },
      { status: 404 },
    );
  }

  const digits = phone ? digitsFromPhoneInput(phone) : "";
  const okRoles = await assertRoleIdsBelongToEvent(eventId, roleIds);
  if (!okRoles) {
    return NextResponse.json({ error: "Invalid role selection." }, { status: 400 });
  }

  await updateUserStaffContact(target.id, {
    firstName: firstName || null,
    lastName: lastName || null,
    phoneDigits: digits.length === 10 ? digits : null,
  });

  await upsertStaffMemberWithRoles(eventId, target.id, roleIds);

  const staff = await getEventStaffList(eventId);
  return NextResponse.json(staff, { status: 201 });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
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

  const parsed = patchEventStaffBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { userId: targetUserId, firstName, lastName, phone, roleIds } = parsed.data;

  const okRoles = await assertRoleIdsBelongToEvent(eventId, roleIds);
  if (!okRoles) {
    return NextResponse.json({ error: "Invalid role selection." }, { status: 400 });
  }

  const digits = phone ? digitsFromPhoneInput(phone) : "";

  const member = await prisma.eventStaffMember.findFirst({
    where: { eventId, userId: targetUserId },
    select: { id: true },
  });
  if (!member) {
    return NextResponse.json({ error: "Staff member not found on this event." }, { status: 404 });
  }

  await updateUserStaffContact(targetUserId, {
    firstName: firstName || null,
    lastName: lastName || null,
    phoneDigits: digits.length === 10 ? digits : null,
  });

  await upsertStaffMemberWithRoles(eventId, targetUserId, roleIds);

  const staff = await getEventStaffList(eventId);
  return NextResponse.json(staff);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
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

  const userId = (raw as { userId?: string }).userId;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  await removeStaffMember(eventId, userId);

  const staff = await getEventStaffList(eventId);
  return NextResponse.json(staff);
}

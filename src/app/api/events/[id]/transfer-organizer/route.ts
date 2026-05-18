import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser, writeAccessDeniedResponse } from "@/lib/auth";
import {
  findUserByEmail,
  getEventStaffList,
  getUserEventRoles,
  transferEventOrganizerRole,
} from "@/lib/event-staff";
import { transferEventOrganizerBodySchema } from "@/lib/validation/event-staff";
import { canAssignEventStaff } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function POST(req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const writeDenied = writeAccessDeniedResponse(user);
  if (writeDenied) return writeDenied;

  const { id: eventId } = await ctx.params;

  const allowed = await authorizeStaffManagement(eventId, user.id, user.platformRole);
  if (!allowed) {
    return NextResponse.json(
      { error: "Forbidden: organizer or admin required" },
      { status: 403 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = transferEventOrganizerBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const target = await findUserByEmail(email);
  if (!target) {
    return NextResponse.json(
      {
        error:
          "No user found with that email. They must create an account before you can transfer organizer access.",
      },
      { status: 404 },
    );
  }

  try {
    await transferEventOrganizerRole(eventId, target.id);
  } catch (e) {
    console.error("transferEventOrganizerRole", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not transfer organizer." },
      { status: 500 },
    );
  }

  const staff = await getEventStaffList(eventId);
  return NextResponse.json(staff);
}

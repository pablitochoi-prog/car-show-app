import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { eventVehicleSaleSettingsSchema } from "@/lib/validation/vehicle-sale-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const allowed = await canManageEvent(
    user.id,
    eventId,
    undefined,
    user.platformRole,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { vehicleSaleInquiriesEnabled: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    vehicleSaleInquiriesEnabled: event.vehicleSaleInquiriesEnabled,
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const allowed = await canManageEvent(
    user.id,
    eventId,
    undefined,
    user.platformRole,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = eventVehicleSaleSettingsSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      vehicleSaleInquiriesEnabled: parsed.data.vehicleSaleInquiriesEnabled,
    },
    select: { vehicleSaleInquiriesEnabled: true },
  });

  return NextResponse.json(updated);
}

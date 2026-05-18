import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { getUserEventRoles } from "@/lib/event-staff";
import { resolveRegistrationContact } from "@/lib/registration-contact";
import { formatEventShowNumber } from "@/lib/event-show-number";

type RouteParams = { params: Promise<{ id: string }> };

function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  const roles = await getUserEventRoles(user.id, eventId);
  const hasStaffAccess =
    roles.includes("REGISTRAR") ||
    roles.includes("ORGANIZER") ||
    roles.includes("TREASURER");
  const allowed =
    hasStaffAccess ||
    (await canManageEvent(user.id, eventId, undefined, user.platformRole));
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { name: true, showNumber: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  const eventCode = formatEventShowNumber(event.showNumber);

  const rows = await prisma.registration.findMany({
    where: { eventId },
    select: {
      id: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          status: true,
        },
      },
      tier: { select: { name: true, priceCents: true } },
      vehicles: {
        include: {
          vehicle: {
            select: { year: true, make: true, model: true, trim: true },
          },
        },
      },
      guestFirstName: true,
      guestLastName: true,
      guestEmail: true,
      guestPhone: true,
      registrantFirstName: true,
      registrantLastName: true,
      registrantEmail: true,
      registrantPhone: true,
      guestVehicles: true,
    },
    orderBy: { createdAt: "asc" },
  });

  type GV = { year?: number; make?: string; model?: string; trim?: string };

  const header = [
    "event_show_number",
    "event_name",
    "status",
    "type",
    "registrant_name",
    "email",
    "phone",
    "tier",
    "tier_price_cents",
    "vehicles",
    "created_at",
  ];

  const lines = [
    header.join(","),
    ...rows.map((r) => {
      const isGuest = !r.user;
      const resolved = resolveRegistrationContact(r);
      const name = resolved.name;
      const regEmail = resolved.email;
      const regPhone = resolved.phone;

      const linkedVehicles = r.vehicles
        .map((rv) => {
          const v = rv.vehicle;
          return [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
        })
        .join("; ");

      const guestVehicleList: GV[] = Array.isArray(r.guestVehicles)
        ? (r.guestVehicles as GV[])
        : [];
      const guestVehicleSummary = guestVehicleList
        .map((gv) => [gv.year, gv.make, gv.model, gv.trim].filter(Boolean).join(" "))
        .join("; ");

      const vehicleSummary = [linkedVehicles, guestVehicleSummary]
        .filter(Boolean)
        .join("; ");

      return [
        csvEscape(eventCode),
        csvEscape(event.name),
        csvEscape(r.status),
        csvEscape(isGuest ? "Guest" : "Member"),
        csvEscape(name),
        csvEscape(regEmail),
        csvEscape(regPhone),
        csvEscape(r.tier.name),
        String(r.tier.priceCents),
        csvEscape(vehicleSummary),
        csvEscape(r.createdAt.toISOString()),
      ].join(",");
    }),
  ];

  const csv = lines.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="registrations-${eventId.slice(0, 8)}.csv"`,
    },
  });
}

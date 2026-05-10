import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { getUserEventRoles } from "@/lib/event-staff";

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
  const hasRegistrarAccess = roles.includes("REGISTRAR") || roles.includes("ORGANIZER");
  const allowed = hasRegistrarAccess || await canManageEvent(user.id, eventId, undefined, user.platformRole);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.registration.findMany({
    where: { eventId },
    select: {
      id: true,
      status: true,
      createdAt: true,
      user: { select: { name: true, email: true, phone: true } },
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
      guestVehicles: true,
    },
    orderBy: { createdAt: "asc" },
  });

  type GV = { year?: number; make?: string; model?: string; trim?: string };

  const header = [
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
      const name = isGuest
        ? `${r.guestFirstName ?? ""} ${r.guestLastName ?? ""}`.trim() || "Guest"
        : r.user!.name;
      const regEmail = isGuest ? (r.guestEmail ?? "") : r.user!.email;
      const regPhone = isGuest ? (r.guestPhone ?? "") : (r.user!.phone ?? "");

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

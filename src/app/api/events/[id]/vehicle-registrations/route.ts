import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageVehicleRegistrations } from "@/lib/vehicle-registrations-auth";
import { loadVehicleRegistrationsGrid } from "@/lib/vehicle-registrations-grid";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const allowed = await canManageVehicleRegistrations(
    user.id,
    eventId,
    user.platformRole,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const grid = await loadVehicleRegistrationsGrid(eventId);
  return NextResponse.json(grid);
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, writeAccessDeniedResponse } from "@/lib/auth";
import { vehicleWriteSchema } from "@/lib/validation/registration";
import { isGaragePhotoViewUrl } from "@/lib/vehicle-photo-access";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const writeDenied = writeAccessDeniedResponse(user);
  if (writeDenied) return writeDenied;

  const { id } = await params;

  const existing = await prisma.vehicle.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = vehicleWriteSchema.partial().safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const d = parsed.data;

  if (
    typeof d.photoUrl === "string" &&
    !isGaragePhotoViewUrl(d.photoUrl)
  ) {
    return NextResponse.json(
      {
        error:
          "Garage vehicle photos must use the private upload flow in My Vehicles.",
      },
      { status: 400 },
    );
  }

  const updated = await prisma.vehicle.update({
    where: { id },
    data: {
      year: d.year ?? undefined,
      make: d.make ?? undefined,
      model: d.model ?? undefined,
      trim: d.trim !== undefined ? d.trim || null : undefined,
      nickname:
        d.nickname !== undefined ? d.nickname ?? null : undefined,
      vin: d.vin !== undefined ? d.vin ?? null : undefined,
      photoUrl:
        d.photoUrl !== undefined ? d.photoUrl ?? null : undefined,
      notes: d.notes !== undefined ? d.notes || null : undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const writeDenied = writeAccessDeniedResponse(user);
  if (writeDenied) return writeDenied;

  const { id } = await params;

  const existing = await prisma.vehicle.findFirst({
    where: { id, userId: user.id },
    include: { _count: { select: { registrationRows: true } } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing._count.registrationRows > 0) {
    return NextResponse.json(
      {
        error:
          "Cannot delete a vehicle that is linked to an event registration.",
      },
      { status: 400 }
    );
  }

  await prisma.vehicle.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

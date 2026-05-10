import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const where = q
    ? {
        OR: [
          { make: { contains: q, mode: "insensitive" as const } },
          { model: { contains: q, mode: "insensitive" as const } },
          { nickname: { contains: q, mode: "insensitive" as const } },
          { vin: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const vehicles = await prisma.vehicle.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      year: true,
      make: true,
      model: true,
      trim: true,
      vin: true,
      nickname: true,
      archivedAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({
    vehicles: vehicles.map((v) => ({
      id: v.id,
      year: v.year,
      make: v.make,
      model: v.model,
      trim: v.trim,
      vin: v.vin,
      nickname: v.nickname,
      archivedAt: v.archivedAt?.toISOString() ?? null,
      ownerName: v.user.name,
      ownerEmail: v.user.email,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as {
    id?: string;
    year?: number;
    make?: string;
    model?: string;
    trim?: string;
    vin?: string;
    nickname?: string;
    archive?: boolean;
  };
  if (!body.id)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.year !== undefined) data.year = body.year;
  if (body.make?.trim()) data.make = body.make.trim();
  if (body.model?.trim()) data.model = body.model.trim();
  if (body.trim !== undefined) data.trim = body.trim?.trim() || null;
  if (body.vin !== undefined) data.vin = body.vin?.trim() || null;
  if (body.nickname !== undefined) data.nickname = body.nickname?.trim() || null;
  if (body.archive === true) data.archivedAt = new Date();
  if (body.archive === false) data.archivedAt = null;

  const updated = await prisma.vehicle.update({
    where: { id: body.id },
    data,
    select: {
      id: true, year: true, make: true, model: true, trim: true, vin: true, nickname: true,
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({
    vehicle: {
      ...updated,
      ownerName: updated.user.name,
      ownerEmail: updated.user.email,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.vehicle.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { registrationTierWriteSchema } from "@/lib/validation/registration";
import {
  isTieredRegistrationFees,
  TIER_MANAGEMENT_FEE_TYPE_ERROR,
} from "@/lib/general-admission-tier";

type RouteParams = { params: Promise<{ id: string }> };

function parseOptionalDate(v: string | null | undefined): Date | null {
  if (v == null || v === "" || (typeof v === "string" && v.trim() === ""))
    return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id: eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, status: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await getCurrentUser();
  const canManage = user
    ? await canManageEvent(user.id, eventId, undefined, user.platformRole)
    : false;

  if (event.status !== "PUBLISHED" && !canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tiers = await prisma.registrationTier.findMany({
    where: { eventId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ tiers });
}

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  const allowed = await canManageEvent(user.id, eventId, undefined, user.platformRole);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { registrationFeeType: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isTieredRegistrationFees(event.registrationFeeType)) {
    return NextResponse.json(
      { error: TIER_MANAGEMENT_FEE_TYPE_ERROR },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = registrationTierWriteSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const d = parsed.data;
  const opensAt = parseOptionalDate(d.opensAt ?? undefined);
  const closesAt = parseOptionalDate(d.closesAt ?? undefined);

  const maxSort = (
    await prisma.registrationTier.aggregate({
      where: { eventId },
      _max: { sortOrder: true },
    })
  )._max.sortOrder ?? -1;

  const tier = await prisma.registrationTier.create({
    data: {
      eventId,
      name: d.name,
      priceCents: d.priceCents,
      opensAt,
      closesAt,
      memberOnly: d.memberOnly ?? false,
      sortOrder: d.sortOrder ?? maxSort + 1,
    },
  });

  return NextResponse.json(tier, { status: 201 });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  const allowed = await canManageEvent(user.id, eventId, undefined, user.platformRole);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { registrationFeeType: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isTieredRegistrationFees(event.registrationFeeType)) {
    return NextResponse.json(
      { error: TIER_MANAGEMENT_FEE_TYPE_ERROR },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { orderedIds } = body as { orderedIds?: string[] };
  if (!orderedIds || !Array.isArray(orderedIds)) {
    return NextResponse.json({ error: "orderedIds array required" }, { status: 400 });
  }

  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.registrationTier.updateMany({
        where: { id, eventId },
        data: { sortOrder: i },
      }),
    ),
  );

  const tiers = await prisma.registrationTier.findMany({
    where: { eventId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ tiers });
}

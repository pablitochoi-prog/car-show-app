import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { registrationTierWriteSchema } from "@/lib/validation/registration";
import {
  isTieredRegistrationFees,
  TIER_MANAGEMENT_FEE_TYPE_ERROR,
} from "@/lib/general-admission-tier";

type RouteParams = {
  params: Promise<{ id: string; tierId: string }>;
};

function parseOptionalDate(v: string | null | undefined): Date | null {
  if (v == null || v === "" || (typeof v === "string" && v.trim() === ""))
    return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, tierId } = await params;

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

  const tier = await prisma.registrationTier.findFirst({
    where: { id: tierId, eventId },
  });

  if (!tier) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = registrationTierWriteSchema.partial().safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const d = parsed.data;

  const updated = await prisma.registrationTier.update({
    where: { id: tierId },
    data: {
      name: d.name ?? undefined,
      priceCents: d.priceCents ?? undefined,
      opensAt:
        d.opensAt !== undefined ? parseOptionalDate(d.opensAt) : undefined,
      closesAt:
        d.closesAt !== undefined ? parseOptionalDate(d.closesAt) : undefined,
      memberOnly: d.memberOnly ?? undefined,
      sortOrder: d.sortOrder ?? undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, tierId } = await params;

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

  const tier = await prisma.registrationTier.findFirst({
    where: { id: tierId, eventId },
    include: { _count: { select: { registrations: true } } },
  });

  if (!tier) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (tier._count.registrations > 0) {
    return NextResponse.json(
      {
        error:
          "Cannot delete a tier that has registrations. Create a new tier instead.",
      },
      { status: 400 }
    );
  }

  await prisma.registrationTier.delete({ where: { id: tierId } });

  return NextResponse.json({ ok: true });
}

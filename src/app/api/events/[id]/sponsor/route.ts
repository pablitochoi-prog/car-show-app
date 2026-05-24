import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { eventSponsorSchema } from "@/lib/validation/sponsor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

const sponsorSelect = {
  sponsorName: true,
  sponsorPrimaryContact: true,
  sponsorStreet: true,
  sponsorCity: true,
  sponsorState: true,
  sponsorZip: true,
  sponsorPhone: true,
  sponsorEmail: true,
  sponsorWebsite: true,
  sponsorLogoUrl: true,
} as const;

function trimOrNull(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

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
    select: sponsorSelect,
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(event);
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

  const parsed = eventSponsorSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const d = parsed.data;

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      ...(d.sponsorName !== undefined
        ? { sponsorName: trimOrNull(d.sponsorName) ?? null }
        : {}),
      ...(d.sponsorPrimaryContact !== undefined
        ? { sponsorPrimaryContact: trimOrNull(d.sponsorPrimaryContact) ?? null }
        : {}),
      ...(d.sponsorStreet !== undefined
        ? { sponsorStreet: trimOrNull(d.sponsorStreet) ?? null }
        : {}),
      ...(d.sponsorCity !== undefined
        ? { sponsorCity: trimOrNull(d.sponsorCity) ?? null }
        : {}),
      ...(d.sponsorState !== undefined
        ? { sponsorState: trimOrNull(d.sponsorState) ?? null }
        : {}),
      ...(d.sponsorZip !== undefined
        ? { sponsorZip: trimOrNull(d.sponsorZip) ?? null }
        : {}),
      ...(d.sponsorPhone !== undefined
        ? { sponsorPhone: trimOrNull(d.sponsorPhone) ?? null }
        : {}),
      ...(d.sponsorEmail !== undefined
        ? { sponsorEmail: trimOrNull(d.sponsorEmail) ?? null }
        : {}),
      ...(d.sponsorWebsite !== undefined
        ? {
            sponsorWebsite:
              d.sponsorWebsite === "" ? null : (d.sponsorWebsite ?? null),
          }
        : {}),
      ...(d.sponsorLogoUrl !== undefined
        ? {
            sponsorLogoUrl:
              d.sponsorLogoUrl === "" || d.sponsorLogoUrl === null
                ? null
                : d.sponsorLogoUrl,
          }
        : {}),
    },
    select: sponsorSelect,
  });

  return NextResponse.json(updated);
}

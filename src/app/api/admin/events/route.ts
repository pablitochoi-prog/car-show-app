import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES = [
  "DRAFT", "SCHEDULED", "PUBLISHED", "ACTIVE", "VOTING", "CLOSED", "ARCHIVED",
];

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const where = q
    ? { name: { contains: q, mode: "insensitive" as const } }
    : {};

  const events = await prisma.event.findMany({
    where,
    orderBy: { startDate: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      showNumber: true,
      city: true,
      state: true,
      startDate: true,
      startTime: true,
      status: true,
      orgId: true,
      organization: { select: { name: true } },
      _count: { select: { registrations: true } },
    },
  });

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      name: e.name,
      showNumber: e.showNumber,
      city: e.city,
      state: e.state,
      startDate: e.startDate.toISOString(),
      startTime: e.startTime ?? null,
      status: e.status,
      orgName: e.organization?.name ?? null,
      registrants: e._count.registrations,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as {
    id?: string;
    name?: string;
    city?: string;
    state?: string;
    status?: string;
  };
  if (!body.id)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (body.status && !VALID_STATUSES.includes(body.status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.name?.trim()) data.name = body.name.trim();
  if (body.city !== undefined) data.city = body.city?.trim() || null;
  if (body.state !== undefined) data.state = body.state?.trim() || null;
  if (body.status) data.status = body.status;

  const event = await prisma.event.update({
    where: { id: body.id },
    data,
    select: { id: true, name: true, city: true, state: true, status: true },
  });

  return NextResponse.json({ event });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.event.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}

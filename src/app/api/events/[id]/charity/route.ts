import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { eventCharitySchema } from "@/lib/validation/charity";
import { timeAsync } from "@/lib/request-timing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

const charitySelect = {
  charityName: true,
  charityDescription: true,
  charityWebsite: true,
  charityEmail: true,
  charityPhone: true,
  charityLogoUrl: true,
} as const;

function trimOrNull(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(_request: Request, { params }: RouteParams) {
  return timeAsync("api.events.charity.GET", async () => {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: eventId } = await params;

    const event = await timeAsync("api.events.charity.event", () =>
      prisma.event.findUnique({
        where: { id: eventId },
        select: { orgId: true, ...charitySelect },
      }),
    );

    if (!event) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const allowed = await timeAsync("api.events.charity.auth", () =>
      canManageEvent(user.id, eventId, event.orgId, user.platformRole),
    );
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { orgId: _orgId, ...charity } = event;
    return NextResponse.json(charity);
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

  const parsed = eventCharitySchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const d = parsed.data;

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      ...(d.charityName !== undefined
        ? { charityName: trimOrNull(d.charityName) ?? null }
        : {}),
      ...(d.charityDescription !== undefined
        ? { charityDescription: trimOrNull(d.charityDescription) ?? null }
        : {}),
      ...(d.charityWebsite !== undefined
        ? {
            charityWebsite:
              d.charityWebsite === "" ? null : (d.charityWebsite ?? null),
          }
        : {}),
      ...(d.charityEmail !== undefined
        ? { charityEmail: trimOrNull(d.charityEmail) ?? null }
        : {}),
      ...(d.charityPhone !== undefined
        ? { charityPhone: trimOrNull(d.charityPhone) ?? null }
        : {}),
      ...(d.charityLogoUrl !== undefined
        ? {
            charityLogoUrl:
              d.charityLogoUrl === "" || d.charityLogoUrl === null
                ? null
                : d.charityLogoUrl,
          }
        : {}),
    },
    select: charitySelect,
  });

  return NextResponse.json(updated);
}

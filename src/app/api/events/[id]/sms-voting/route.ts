import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { getSharedSmsNumberDisplay, buildDashCardSmsLine } from "@/lib/sms/shared-sms-number";
import { listSmsVotingEligibleAwardNames } from "@/lib/sms/sms-voting-eligible-awards";
import { createEventSmsVotingSettingsSchema } from "@/lib/validation/sms-voting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

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
    select: {
      smsVotingEnabled: true,
      smsVotingStartsAt: true,
      smsVotingEndsAt: true,
      smsVotePrefix: true,
      votingCategories: {
        orderBy: { smsOptionNumber: "asc" },
      },
    },
  });
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [smsNumber, smsPresets] = await Promise.all([
    getSharedSmsNumberDisplay(),
    listSmsVotingEligibleAwardNames(),
  ]);
  const sampleCode = event.smsVotePrefix
    ? `${event.smsVotePrefix}-004`
    : "AXY-004";
  const instructionPreview = buildDashCardSmsLine(sampleCode, smsNumber);

  return NextResponse.json({
    smsVotingEnabled: event.smsVotingEnabled,
    smsVotingStartsAt: event.smsVotingStartsAt?.toISOString() ?? null,
    smsVotingEndsAt: event.smsVotingEndsAt?.toISOString() ?? null,
    smsNumber,
    presets: smsPresets,
    categories: event.votingCategories.map((c) => ({
      id: c.id,
      name: c.name,
      smsOptionNumber: c.smsOptionNumber,
      isActive: c.isActive,
      isCustom: c.isCustom,
      maxVotesPerPhone: c.maxVotesPerPhone,
    })),
    instructionPreview,
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

  const smsPresets = await listSmsVotingEligibleAwardNames();
  const parsed = createEventSmsVotingSettingsSchema(smsPresets).safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { smsVotingEnabled, smsVotingStartsAt, smsVotingEndsAt, categories } =
    parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: eventId },
      data: {
        smsVotingEnabled,
        smsVotingStartsAt: smsVotingStartsAt
          ? new Date(smsVotingStartsAt)
          : null,
        smsVotingEndsAt: smsVotingEndsAt ? new Date(smsVotingEndsAt) : null,
      },
    });

    await tx.votingCategory.deleteMany({ where: { eventId } });

    if (categories.length > 0) {
      await tx.votingCategory.createMany({
        data: categories.map((c) => ({
          eventId,
          name: c.name.trim(),
          smsOptionNumber: c.smsOptionNumber,
          isActive: c.isActive,
          isCustom: c.isCustom ?? false,
          maxVotesPerPhone: c.maxVotesPerPhone ?? 1,
        })),
      });
    }
  });

  return GET(request, { params });
}

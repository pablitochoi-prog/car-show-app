import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApiUser } from "@/lib/help/require-admin-api";
import { promoCodeUpdateSchema } from "@/lib/validation/promo-code";
import { resolvePromoCodeExpiresAtUpdate } from "@/lib/promo-codes/promo-code-expiration";
import { adminManualStatusTransitionError } from "@/lib/promo-codes/promo-code-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { response } = await requireAdminApiUser();
  if (response) return response;

  const { id } = await params;
  const promoCode = await prisma.platformFeePromoCode.findUnique({
    where: { id },
    include: {
      redeemedBy: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      redeemedEvent: {
        select: { id: true, name: true, showNumber: true },
      },
      createdBy: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });

  if (!promoCode) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({ promoCode });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { user, response } = await requireAdminApiUser();
  if (response) return response;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = promoCodeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const existing = await prisma.platformFeePromoCode.findUnique({
    where: { id },
    select: { id: true, status: true, expiresAt: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (parsed.data.status && parsed.data.status !== existing.status) {
    const transitionError = adminManualStatusTransitionError(
      existing.status,
      parsed.data.status,
    );
    if (transitionError) {
      return NextResponse.json({ error: transitionError }, { status: 400 });
    }
  }

  const expiresAt = resolvePromoCodeExpiresAtUpdate({
    previousStatus: existing.status,
    nextStatus: parsed.data.status,
    explicitExpiresAt: parsed.data.expiresAt,
    currentExpiresAt: existing.expiresAt,
  });

  const promoCode = await prisma.platformFeePromoCode.update({
    where: { id },
    data: {
      ...(parsed.data.status !== undefined
        ? { status: parsed.data.status }
        : {}),
      ...(expiresAt !== undefined ? { expiresAt } : {}),
      ...(parsed.data.internalNotes !== undefined
        ? { internalNotes: parsed.data.internalNotes }
        : {}),
      ...(parsed.data.reservedOrganizationName !== undefined
        ? { reservedOrganizationName: parsed.data.reservedOrganizationName }
        : {}),
      ...(parsed.data.reservedEventName !== undefined
        ? { reservedEventName: parsed.data.reservedEventName }
        : {}),
      ...(parsed.data.reservedEventState !== undefined
        ? { reservedEventState: parsed.data.reservedEventState }
        : {}),
      updatedByUserId: user!.id,
    },
  });

  return NextResponse.json({ promoCode });
}

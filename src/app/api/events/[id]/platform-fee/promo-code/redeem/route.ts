import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { promoCodeRedeemSchema } from "@/lib/validation/promo-code";
import {
  redeemPlatformFeePromoCode,
  PROMO_REDEEM_SUCCESS_MESSAGE,
} from "@/lib/promo-codes/promo-code-redeem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
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

  const parsed = promoCodeRedeemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const result = await redeemPlatformFeePromoCode(prisma, {
    eventId,
    rawCode: parsed.data.code,
    userId: user.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: PROMO_REDEEM_SUCCESS_MESSAGE,
    platformSetupFeeCollected: true,
    platformFeePromoApplied: true,
    codeLast4: result.codeLast4,
  });
}

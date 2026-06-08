import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApiUser } from "@/lib/help/require-admin-api";
import { promoCodeBulkSchema } from "@/lib/validation/promo-code";
import { bulkStatusTransitionError } from "@/lib/promo-codes/promo-code-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { user, response } = await requireAdminApiUser();
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = promoCodeBulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid bulk request." },
      { status: 400 },
    );
  }

  const { ids, status: nextStatus } = parsed.data;

  const records = await prisma.platformFeePromoCode.findMany({
    where: { id: { in: ids } },
    select: { id: true, status: true },
  });

  if (records.length !== ids.length) {
    return NextResponse.json(
      { error: "One or more promo codes were not found." },
      { status: 400 },
    );
  }

  for (const record of records) {
    const err = bulkStatusTransitionError(record.status, nextStatus);
    if (err) {
      return NextResponse.json({ error: err }, { status: 400 });
    }
  }

  await prisma.platformFeePromoCode.updateMany({
    where: { id: { in: ids } },
    data: {
      status: nextStatus,
      updatedByUserId: user!.id,
    },
  });

  return NextResponse.json({ ok: true, updated: ids.length });
}

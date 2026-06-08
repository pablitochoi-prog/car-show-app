import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  buildPromoCodesAdminOrderBy,
  buildPromoCodesAdminWhere,
  promoCodesAdminTableConfig,
} from "@/lib/admin-table/promo-codes-table-config";
import { parseAdminTableParams } from "@/lib/admin-table/parse-admin-table-params";
import {
  adminTableMeta,
  adminTableSkip,
} from "@/lib/admin-table/admin-table-response";
import { requireAdminApiUser } from "@/lib/help/require-admin-api";
import { activePromoCodeExpiresAt } from "@/lib/promo-codes/promo-code-expiration";
import { generateUniquePromoCodes } from "@/lib/promo-codes/promo-code-generator";
import { promoCodeCreateSchema } from "@/lib/validation/promo-code";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { response } = await requireAdminApiUser();
  if (response) return response;

  const params = parseAdminTableParams(
    req.nextUrl.searchParams,
    promoCodesAdminTableConfig,
  );
  const where = buildPromoCodesAdminWhere(params);
  const orderBy = buildPromoCodesAdminOrderBy(params);
  const skip = adminTableSkip(params.page, params.pageSize);

  const [total, promoCodes] = await Promise.all([
    prisma.platformFeePromoCode.count({ where }),
    prisma.platformFeePromoCode.findMany({
      where,
      orderBy,
      skip,
      take: params.pageSize,
      include: {
        redeemedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    promoCodes,
    meta: adminTableMeta(total, params.page, params.pageSize),
  });
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireAdminApiUser();
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const parsed = promoCodeCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const { count, status: createStatus } = parsed.data;
  const status = createStatus ?? "DRAFT";
  const expiresAt =
    parsed.data.expiresAt !== undefined
      ? parsed.data.expiresAt
        ? new Date(parsed.data.expiresAt)
        : null
      : status === "ACTIVE"
        ? activePromoCodeExpiresAt()
        : null;

  try {
    const codes = await generateUniquePromoCodes(prisma, count);

    const promoCodes = await prisma.$transaction(
      codes.map((code) =>
        prisma.platformFeePromoCode.create({
          data: {
            code,
            status,
            expiresAt,
            internalNotes: parsed.data.internalNotes ?? null,
            reservedOrganizationName:
              parsed.data.reservedOrganizationName ?? null,
            reservedEventName: parsed.data.reservedEventName ?? null,
            reservedEventState: parsed.data.reservedEventState ?? null,
            createdByUserId: user!.id,
            updatedByUserId: user!.id,
          },
        }),
      ),
    );

    if (count === 1) {
      return NextResponse.json(
        {
          promoCode: promoCodes[0],
          count: 1,
          message: "Promo code created.",
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      {
        promoCodes,
        count: promoCodes.length,
        message: `${promoCodes.length} promo codes created.`,
      },
      { status: 201 },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not create promo code.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

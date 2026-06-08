import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildPromoCodesCsv } from "@/lib/promo-codes/promo-code-csv";
import { requireAdminApiUser } from "@/lib/help/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EXPORT_IDS = 500;

export async function GET(req: NextRequest) {
  const { response } = await requireAdminApiUser();
  if (response) return response;

  const idsParam = req.nextUrl.searchParams.get("ids")?.trim();
  if (!idsParam) {
    return NextResponse.json(
      { error: "Select at least one promo code to export." },
      { status: 400 },
    );
  }

  const ids = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "Select at least one promo code to export." },
      { status: 400 },
    );
  }

  if (ids.length > MAX_EXPORT_IDS) {
    return NextResponse.json(
      { error: `Export limited to ${MAX_EXPORT_IDS} promo codes at a time.` },
      { status: 400 },
    );
  }

  const rows = await prisma.platformFeePromoCode.findMany({
    where: { id: { in: ids } },
    include: {
      redeemedBy: {
        select: { email: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const csv = buildPromoCodesCsv(rows);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="promo-codes-${stamp}.csv"`,
    },
  });
}

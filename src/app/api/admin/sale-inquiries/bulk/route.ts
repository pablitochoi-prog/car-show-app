import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, writeAccessDeniedResponse } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.literal("delete"),
  ids: z.array(z.string().uuid()).min(1).max(200),
});

/** POST /api/admin/sale-inquiries/bulk — site admin bulk delete. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const writeDenied = writeAccessDeniedResponse(user);
  if (writeDenied) return writeDenied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "Invalid bulk delete payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const ids = [...new Set(parsed.data.ids)];
  const result = await prisma.vehicleSaleInquiry.deleteMany({
    where: { id: { in: ids } },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "No matching sale inquiries were found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, deletedCount: result.count });
}

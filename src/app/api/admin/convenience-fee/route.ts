import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { getPlatformFee } from "@/lib/platform-fee";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  type: z.enum(["NONE", "FIXED", "PERCENT"]),
  amountCents: z.number().int().min(0).optional().nullable(),
  percent: z.number().min(0).max(100).optional().nullable(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fee = await getPlatformFee();
  return NextResponse.json({ fee });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { type, amountCents, percent } = parsed.data;

  const value = {
    type,
    amountCents: type === "FIXED" ? (amountCents ?? 0) : null,
    percent: type === "PERCENT" ? (percent ?? 0) : null,
  };

  await prisma.globalSetting.upsert({
    where: { key: "platform_fee" },
    update: { value },
    create: { key: "platform_fee", value },
  });

  return NextResponse.json({ fee: value });
}

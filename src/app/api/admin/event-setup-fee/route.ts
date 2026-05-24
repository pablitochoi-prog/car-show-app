import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { getEventSetupFee } from "@/lib/platform-fee";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  amountCents: z.number().int().min(0),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fee = await getEventSetupFee();
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

  const value = { amountCents: parsed.data.amountCents };

  await prisma.globalSetting.upsert({
    where: { key: "event_setup_fee" },
    update: { value },
    create: { key: "event_setup_fee", value },
  });

  return NextResponse.json({ fee: value });
}

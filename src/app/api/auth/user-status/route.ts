import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight status check for middleware (banned redirect). */
export async function GET() {
  const supabaseUser = await getSession();
  if (!supabaseUser) {
    return NextResponse.json({ status: null });
  }

  const row = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
    select: { status: true },
  });

  return NextResponse.json({ status: row?.status ?? "ACTIVE" });
}

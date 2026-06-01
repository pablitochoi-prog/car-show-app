import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVerifiedSupabaseUser } from "@/lib/supabase-auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight status check for middleware (banned redirect). */
export async function GET() {
  const supabaseUser = await getVerifiedSupabaseUser();
  if (!supabaseUser) {
    return NextResponse.json({ status: null });
  }

  const row = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
    select: { status: true },
  });

  return NextResponse.json({ status: row?.status ?? "ACTIVE" });
}

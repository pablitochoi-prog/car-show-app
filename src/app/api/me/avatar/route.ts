import { NextResponse } from "next/server";
import { getCurrentUser, writeAccessDeniedResponse } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const writeDenied = writeAccessDeniedResponse(user);
  if (writeDenied) return writeDenied;

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: null },
  });

  return NextResponse.json({ ok: true });
}

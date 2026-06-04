import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { SESSION_ACTIVITY_COOKIE } from "@/lib/session-idle-config";
import {
  buildSessionActivityStatus,
  resolveLastActivityAtMs,
  sessionActivityPayload,
  setActivityCookie,
  touchUserLastActivityDb,
} from "@/lib/session-activity-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_EXPIRED_BODY = {
  error: "Session expired due to inactivity.",
  sessionExpired: true,
  reason: "idle" as const,
};

/** Return server-authoritative idle session state for the client warning modal. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { lastActivityAt: true },
  });

  const lastActivityAtMs = resolveLastActivityAtMs(
    cookieStore.get(SESSION_ACTIVITY_COOKIE)?.value,
    dbUser?.lastActivityAt,
  );
  const status = buildSessionActivityStatus(lastActivityAtMs);

  if (status.kind === "expired") {
    return NextResponse.json(SESSION_EXPIRED_BODY, { status: 401 });
  }

  if (status.kind === "missing") {
    return NextResponse.json({
      ok: true,
      cookieMissing: true,
      lastActivityAt: null,
      expiresAt: null,
      idleMs: 0,
      msUntilExpiry: null,
    });
  }

  return NextResponse.json({
    ok: true,
    ...status.payload,
  });
}

/** Heartbeat from client activity — resets sliding idle timer (server cookie). */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nowMs = Date.now();
  const response = NextResponse.json({
    ok: true,
    ...sessionActivityPayload(nowMs, nowMs),
  });
  setActivityCookie(response, nowMs);
  void touchUserLastActivityDb(user.id, nowMs);
  return response;
}

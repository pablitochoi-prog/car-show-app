import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { SESSION_ACTIVITY_COOKIE } from "@/lib/session-idle-config";
import { parseActivityTimestamp } from "@/lib/session-idle";
import {
  sessionActivityPayload,
  setActivityCookie,
  touchUserLastActivityDb,
} from "@/lib/session-activity-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Return server-authoritative idle session state for the client warning modal. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const lastActivityAtMs =
    parseActivityTimestamp(cookieStore.get(SESSION_ACTIVITY_COOKIE)?.value) ??
    Date.now();
  const payload = sessionActivityPayload(lastActivityAtMs);

  return NextResponse.json({
    ok: true,
    ...payload,
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

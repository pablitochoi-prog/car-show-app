import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  SESSION_STRIPE_PAUSE_MINUTES,
} from "@/lib/session-idle-config";
import { setIdlePauseCookie } from "@/lib/session-activity-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Pause idle enforcement during an active Stripe checkout flow (2 hours). */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = NextResponse.json({
    ok: true,
    pausedMinutes: SESSION_STRIPE_PAUSE_MINUTES,
  });
  setIdlePauseCookie(response);
  return response;
}

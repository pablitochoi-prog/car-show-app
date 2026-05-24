import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import {
  getPlatformStripeStatus,
  isPlatformStripeReady,
} from "@/lib/stripe-platform";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = await getPlatformStripeStatus();

  return NextResponse.json({
    status,
    ready: isPlatformStripeReady(status),
    convenienceFeeNote:
      "Convenience fees from vehicle registrations are collected automatically via Stripe Connect application fees on each registrant checkout.",
  });
}

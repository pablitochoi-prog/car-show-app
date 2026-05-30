import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Temporary admin-only debug route — presence flags only, never secret values. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    sendgridApiKeyPresent: Boolean(process.env.SENDGRID_API_KEY?.trim()),
    sendgridFromPresent: Boolean(process.env.SENDGRID_FROM_EMAIL?.trim()),
    sendgridReplyToPresent: Boolean(process.env.SENDGRID_REPLY_TO?.trim()),
  });
}

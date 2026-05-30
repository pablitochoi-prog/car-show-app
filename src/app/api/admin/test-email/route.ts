import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { sendTestEmail } from "@/lib/email/sendgrid";
import { isSiteAdmin } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  to: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().email("Enter a valid email address").optional(),
  ),
});

/** Temporary admin-only route to verify SendGrid configuration. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown = {};
  try {
    const raw = await request.text();
    if (raw.trim()) {
      body = JSON.parse(raw);
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const to =
    parsed.data.to?.trim().toLowerCase() ?? user.email?.trim().toLowerCase();
  if (!to) {
    return NextResponse.json(
      {
        error:
          "No recipient email. Provide \"to\" in the request body or use an admin account with an email address.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await sendTestEmail({ to });

    if (result.sent) {
      console.info("[admin/test-email] Sent test email", {
        to,
        messageId: result.messageId ?? null,
      });
    } else if (result.skipped) {
      console.warn("[admin/test-email] Skipped:", { to, reason: result.reason });
    } else {
      console.error("[admin/test-email] Failed:", { to, error: result.error });
    }

    return NextResponse.json({
      to,
      result,
    });
  } catch (error) {
    console.error("[admin/test-email] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

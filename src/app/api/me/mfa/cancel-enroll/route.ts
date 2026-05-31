import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { removeUnverifiedTotpFactors } from "@/lib/mfa-session";
import { isSiteAdmin } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  factorId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSiteAdmin(user)) {
    return NextResponse.json(
      { error: "Authenticator MFA is only available for site admins." },
      { status: 403 },
    );
  }

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const supabase = await createClient();

  if (parsed.data.factorId) {
    const { error } = await supabase.auth.mfa.unenroll({
      factorId: parsed.data.factorId,
    });
    if (error) {
      return NextResponse.json(
        { error: "Could not cancel setup. Try again." },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  await removeUnverifiedTotpFactors(supabase);
  return NextResponse.json({ ok: true });
}

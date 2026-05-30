import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import {
  getLegalPolicies,
  saveLegalPolicies,
} from "@/lib/legal-policies";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  smsTextPolicyHtml: z.string().max(200_000).optional().nullable(),
  privacyPolicyHtml: z.string().max(200_000).optional().nullable(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const policies = await getLegalPolicies();
  return NextResponse.json({ policies });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (
    parsed.data.smsTextPolicyHtml === undefined &&
    parsed.data.privacyPolicyHtml === undefined
  ) {
    return NextResponse.json(
      { error: "No policy fields to update" },
      { status: 400 },
    );
  }

  const policies = await saveLegalPolicies(parsed.data);
  return NextResponse.json({ policies });
}

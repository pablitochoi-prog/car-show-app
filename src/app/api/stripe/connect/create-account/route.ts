import { NextResponse } from "next/server";
import { getCurrentUser, requireOrgOwner } from "@/lib/auth";
import { createConnectedAccount, createAccountLink } from "@/lib/stripe-connect";
import { createConnectedAccountSchema } from "@/lib/validation/stripe";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createConnectedAccountSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { orgId, returnPath, origin } = parsed.data;
  const safeReturnPath =
    returnPath?.startsWith("/") && !returnPath.startsWith("//")
      ? returnPath
      : undefined;

  try {
    await requireOrgOwner(user.id, orgId);
  } catch {
    return NextResponse.json(
      { error: "Only the organization owner can connect Stripe" },
      { status: 403 }
    );
  }

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { name: true, contactEmail: true },
  });

  try {
    const accountId = await createConnectedAccount(
      orgId,
      org.name,
      org.contactEmail ?? user.email
    );

    const onboardingUrl = await createAccountLink(accountId, orgId, {
      returnPath: safeReturnPath,
      origin,
    });

    return NextResponse.json({ accountId, onboardingUrl }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/stripe/connect/create-account]", err);
    return NextResponse.json(
      { error: "Failed to create Stripe account. Please try again." },
      { status: 500 }
    );
  }
}

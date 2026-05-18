import { NextResponse } from "next/server";
import { getCurrentUser, requireOrgOwner } from "@/lib/auth";
import { disconnectOrganizationStripe } from "@/lib/stripe-connect";
import { disconnectStripeSchema } from "@/lib/validation/stripe";

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

  const parsed = disconnectStripeSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { orgId } = parsed.data;

  try {
    await requireOrgOwner(user.id, orgId);
  } catch {
    return NextResponse.json(
      { error: "Only the organization owner can disconnect Stripe" },
      { status: 403 },
    );
  }

  try {
    const result = await disconnectOrganizationStripe(orgId);
    return NextResponse.json({
      ok: true,
      disconnected: result.disconnected,
      message: result.disconnected
        ? "Stripe has been disconnected. Online payments are turned off for your events."
        : "No Stripe account was connected.",
    });
  } catch (err) {
    console.error("[POST /api/stripe/connect/disconnect]", err);
    return NextResponse.json(
      { error: "Failed to disconnect Stripe. Please try again." },
      { status: 500 },
    );
  }
}

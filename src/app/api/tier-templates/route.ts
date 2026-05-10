import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTierTemplates } from "@/lib/admin-tier-templates";

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await getTierTemplates();
  const names = templates.map((t) => t.name);
  return NextResponse.json({ names });
}

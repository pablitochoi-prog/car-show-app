import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";

export async function requireAdminApiUser() {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return {
      user: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { user, response: null };
}

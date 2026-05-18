import type { User } from "@prisma/client";
import { NextResponse } from "next/server";
import { isSiteAdmin } from "@/lib/permissions";

/** Site admins bypass suspend read-only rules. */
export function canUserWrite(user: Pick<User, "status" | "platformRole">): boolean {
  if (isSiteAdmin(user)) return true;
  return user.status !== "SUSPENDED";
}

export function isUserBanned(user: Pick<User, "status">): boolean {
  return user.status === "BANNED";
}

export function isUserSuspended(user: Pick<User, "status">): boolean {
  return user.status === "SUSPENDED";
}

/** Use in API mutation handlers; returns a 403 response or null if allowed. */
export function writeAccessDeniedResponse(
  user: Pick<User, "status" | "platformRole">,
): NextResponse | null {
  if (isUserBanned(user)) {
    return NextResponse.json(
      { error: "Your account has been banned." },
      { status: 403 },
    );
  }
  if (canUserWrite(user)) return null;
  return NextResponse.json(
    { error: "Your account is suspended. Contact support." },
    { status: 403 },
  );
}

import type { NextResponse } from "next/server";
import { STEP_UP_COOKIE_NAME } from "@/lib/step-up-config";

/** Edge-safe — clears step-up cookie without node:crypto. */
export function clearStepUpCookie(response: NextResponse): void {
  response.cookies.set(STEP_UP_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

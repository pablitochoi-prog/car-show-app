import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { logObservabilityError } from "@/lib/structured-logging";

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (err) {
    logObservabilityError({ source: "middleware", error: err });
    // API routes must never receive Next.js HTML error pages (breaks fetch().json()).
    if (request.nextUrl.pathname.startsWith("/api/")) {
      const msg =
        err instanceof Error
          ? err.message
          : "Request failed in middleware. Check the terminal log.";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    throw err;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

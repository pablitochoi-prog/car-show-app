import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * For Route Handlers: Supabase session cookies must be set on the same
 * {@link NextResponse} you return. `cookies()` from `next/headers` alone does not
 * reliably attach Set-Cookie to JSON or redirect responses from API routes.
 */
export async function createSupabaseForResponse(res: NextResponse) {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}

/** Copy Set-Cookie headers from one route response to another (e.g. after rebuilding JSON body). */
export function copyResponseCookies(from: NextResponse, to: NextResponse) {
  for (const c of from.cookies.getAll()) {
    to.cookies.set(c.name, c.value, c);
  }
}

/** JSON response with Supabase auth cookies (PKCE verifier, session) from a prior auth call. */
export function jsonWithSupabaseCookies<T extends Record<string, unknown>>(
  authResponse: NextResponse,
  body: T,
  init?: ResponseInit,
): NextResponse {
  const out = NextResponse.json(body, init);
  copyResponseCookies(authResponse, out);
  return out;
}

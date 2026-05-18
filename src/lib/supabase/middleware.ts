import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them to .env.local and restart `npm run dev`."
    );
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    url,
    anon,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user: User | null = null;
  try {
    const res = await supabase.auth.getUser();
    user = res.data.user;
  } catch (e) {
    console.error("[middleware] supabase.auth.getUser()", e);
    throw e;
  }

  // Redirect unauthenticated users away from protected routes
  const protectedPaths = ["/dashboard", "/organizer", "/admin"];
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const skipBanCheck =
    request.nextUrl.pathname === "/banned" ||
    request.nextUrl.pathname.startsWith("/api/auth/");

  if (user && isProtected && !skipBanCheck) {
    try {
      const statusUrl = new URL("/api/auth/user-status", request.nextUrl.origin);
      const statusRes = await fetch(statusUrl, {
        headers: { cookie: request.headers.get("cookie") ?? "" },
      });
      if (statusRes.ok) {
        const data = (await statusRes.json()) as { status?: string | null };
        if (data.status === "BANNED") {
          const bannedUrl = request.nextUrl.clone();
          bannedUrl.pathname = "/banned";
          bannedUrl.search = "";
          return NextResponse.redirect(bannedUrl);
        }
      }
    } catch (e) {
      console.error("[middleware] user-status check failed", e);
    }
  }

  return supabaseResponse;
}

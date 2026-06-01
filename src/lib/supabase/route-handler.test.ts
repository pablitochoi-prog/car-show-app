import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import {
  copyResponseCookies,
  jsonWithSupabaseCookies,
} from "@/lib/supabase/route-handler";

describe("supabase route-handler cookie helpers", () => {
  it("jsonWithSupabaseCookies copies PKCE verifier cookies to the JSON response", () => {
    const authResponse = NextResponse.json({ ok: true });
    authResponse.cookies.set("sb-test-auth-token-code-verifier", "verifier-abc", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });

    const out = jsonWithSupabaseCookies(
      authResponse,
      { requiresEmailVerification: true },
      { status: 201 },
    );

    expect(out.status).toBe(201);
    expect(out.cookies.get("sb-test-auth-token-code-verifier")?.value).toBe(
      "verifier-abc",
    );
  });

  it("copyResponseCookies copies all cookies between responses", () => {
    const from = NextResponse.json({});
    from.cookies.set("a", "1");
    from.cookies.set("b", "2");
    const to = NextResponse.json({});
    copyResponseCookies(from, to);
    expect(to.cookies.get("a")?.value).toBe("1");
    expect(to.cookies.get("b")?.value).toBe("2");
  });
});

import { NextResponse } from "next/server";
import { createSupabaseForResponse } from "@/lib/supabase/route-handler";
import { resetPasswordSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();

    const base = (
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    ).replace(/\/$/, "");
    const nextPath = "/reset-password/update";
    const redirectTo = `${base}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const response = NextResponse.json({
      message: "If an account exists, a reset link has been sent",
    });
    const supabase = await createSupabaseForResponse(response);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      console.error("Password reset error:", error.message, error.code);
      if (process.env.NODE_ENV === "development") {
        return NextResponse.json(
          {
            error: error.message,
            hint:
              "Ensure NEXT_PUBLIC_APP_URL matches how you open the app and Supabase Auth redirect URLs include {origin}/auth/callback (see .env.example).",
          },
          { status: 502 }
        );
      }
    }

    // Success, or generic message when we hide misconfig in production (anti-enumeration).
    // Return the same response object so PKCE cookies from Supabase are included.
    return response;
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import {
  copyResponseCookies,
  createSupabaseForResponse,
} from "@/lib/supabase/route-handler";
import { prisma } from "@/lib/db";
import { signupSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    console.error("Signup: missing NEXT_PUBLIC_SUPABASE_URL or ANON_KEY");
    return NextResponse.json(
      { error: "Server configuration error (Supabase)." },
      { status: 500 }
    );
  }

  if (!process.env.DATABASE_URL) {
    console.error("Signup: missing DATABASE_URL");
    return NextResponse.json(
      { error: "Server configuration error (database)." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstError.message },
      { status: 400 }
    );
  }

  const { username, firstName, lastName, email, password, phone } = parsed.data;
  const displayName = `${firstName} ${lastName}`.trim();

  try {
    const usernameTaken = await prisma.user.findUnique({
      where: { username },
    });
    if (usernameTaken) {
      return NextResponse.json(
        {
          error:
            "That username is already taken. Please choose a unique username.",
          code: "USERNAME_TAKEN",
        },
        { status: 409 }
      );
    }

    const cookieResponse = NextResponse.json(
      {
        message: "Account created successfully",
        requiresEmailVerification: false,
      },
      { status: 201 }
    );
    const supabase = await createSupabaseForResponse(cookieResponse);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const base = appUrl.replace(/\/$/, "");
    const emailRedirectTo = `${base}/auth/callback?next=${encodeURIComponent("/dashboard")}`;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: displayName,
          username,
          first_name: firstName,
          last_name: lastName,
        },
        emailRedirectTo,
      },
    });

    if (authError) {
      const isEmailRateLimit =
        authError.code === "over_email_send_rate_limit" ||
        authError.message.toLowerCase().includes("email rate limit");

      if (isEmailRateLimit) {
        return NextResponse.json(
          {
            error:
              "Too many sign-up emails were sent recently (Supabase limit). Wait about an hour and try again. For local testing, turn off Confirm email under Supabase Dashboard: Authentication, then Providers, then Email; or add custom SMTP for higher limits.",
          },
          { status: 429 }
        );
      }

      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user?.id) {
      return NextResponse.json(
        {
          error:
            "Could not complete signup. If your project requires email confirmation, check your inbox — you may need to verify before signing in.",
        },
        { status: 400 }
      );
    }

    const authEmail = (authData.user.email ?? email).trim().toLowerCase();
    const hasSession = authData.session != null;

    try {
      await prisma.user.create({
        data: {
          supabaseId: authData.user.id,
          email: authEmail,
          username,
          firstName,
          lastName,
          name: displayName,
          phone: phone || null,
        },
      });
    } catch (dbError) {
      if (
        dbError instanceof Prisma.PrismaClientKnownRequestError &&
        dbError.code === "P2002"
      ) {
        const target = dbError.meta?.target;
        const fields = Array.isArray(target)
          ? target.map(String)
          : target != null
            ? [String(target)]
            : [];

        if (fields.some((f) => f.includes("username"))) {
          return NextResponse.json(
            {
              error:
                "That username is already taken. Please choose a unique username.",
              code: "USERNAME_TAKEN",
            },
            { status: 409 }
          );
        }
        if (fields.some((f) => f.includes("email"))) {
          return NextResponse.json(
            {
              error:
                "That email is already registered in our system. Try logging in instead.",
            },
            { status: 409 }
          );
        }

        return NextResponse.json(
          {
            error:
              "An account with these details already exists. Try logging in instead.",
          },
          { status: 409 }
        );
      }

      console.error("Signup prisma error:", dbError);

      const detail =
        process.env.NODE_ENV === "development" && dbError instanceof Error
          ? dbError.message
          : "Could not save your profile. Please try again.";

      return NextResponse.json({ error: detail }, { status: 500 });
    }

    const payload = {
      message: "Account created successfully",
      requiresEmailVerification: !hasSession,
    };

    if (hasSession) {
      const out = NextResponse.json(payload, { status: 201 });
      copyResponseCookies(cookieResponse, out);
      return out;
    }

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    console.error("Signup error:", error);

    const detail =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Internal server error";

    return NextResponse.json({ error: detail }, { status: 500 });
  }
}

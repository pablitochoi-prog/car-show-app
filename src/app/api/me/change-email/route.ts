import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

const bodySchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address.")
    .transform((s) => s.trim().toLowerCase()),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid email";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const newEmail = parsed.data.email;

  if (newEmail === user.email) {
    return NextResponse.json(
      { error: "That is already your current email address." },
      { status: 400 }
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const supabase = await createClient();
  const { error: supaErr } = await supabase.auth.updateUser(
    { email: newEmail },
    {
      emailRedirectTo: `${appUrl}/dashboard/profile?email_updated=1`,
    }
  );

  if (supaErr) {
    console.error("change-email: supabase error", supaErr.message);
    if (
      supaErr.message.toLowerCase().includes("rate limit") ||
      supaErr.message.toLowerCase().includes("over_email")
    ) {
      return NextResponse.json(
        {
          error:
            "Too many email change requests. Wait a few minutes and try again.",
        },
        { status: 429 }
      );
    }
    return NextResponse.json(
      {
        error:
          "Could not initiate email change. Make sure the new email is not already in use.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    message:
      "A confirmation link has been sent to your new email address. Click the link to complete the change.",
  });
}

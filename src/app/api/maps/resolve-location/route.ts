import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  resolveEventLocation,
  resolveLocationMapsDisabledReason,
} from "@/lib/resolve-event-location";

const bodySchema = z.object({
  query: z.string().min(3, "Enter at least 3 characters").max(500),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const disabled = resolveLocationMapsDisabledReason();
  if (disabled) {
    return NextResponse.json({ error: disabled }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const result = await resolveEventLocation(parsed.data.query);
  if (!result) {
    return NextResponse.json(
      {
        error:
          "No matching location found. Try a venue name and city, or a full street address.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}

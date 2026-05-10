import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { resolveCarClubMeetingLocation } from "@/lib/resolve-car-club-meeting";
import { resolveLocationMapsDisabledReason } from "@/lib/resolve-event-location";

const bodySchema = z
  .object({
    city: z.string().min(1, "City is required").max(120),
    state: z.string().length(2, "Pick a two-letter state"),
    place: z.string().max(300).optional(),
    street: z.string().max(300).optional(),
  })
  .superRefine((data, ctx) => {
    const p = data.place?.trim() ?? "";
    const s = data.street?.trim() ?? "";
    if (!p && !s) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Enter either a place name (venue) or a street address, plus city and state.",
        path: ["place"],
      });
    }
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

  const result = await resolveCarClubMeetingLocation(parsed.data);
  if (!result) {
    return NextResponse.json(
      {
        error:
          "No matching location found. Check spelling, or try the other mode (venue vs street address).",
      },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}

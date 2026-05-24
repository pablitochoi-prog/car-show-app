import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import {
  getPlatformSponsor,
  savePlatformSponsor,
} from "@/lib/platform-sponsor";
import { z } from "zod";
import { optionalWebsiteField } from "@/lib/validation/optional-contact-fields";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z
    .string()
    .max(200)
    .optional()
    .nullable()
    .transform((v) => (v == null || v.trim() === "" ? null : v.trim())),
  email: z
    .string()
    .max(320)
    .optional()
    .nullable()
    .transform((v) => (v == null || v.trim() === "" ? null : v.trim()))
    .refine((v) => v == null || (v.includes("@") && v.includes(".")), {
      message: "Enter a valid email address",
    }),
  website: optionalWebsiteField(),
  logoUrl: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sponsor = await getPlatformSponsor();
  return NextResponse.json({ sponsor });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const sponsor = await savePlatformSponsor({
    ...parsed.data,
    website:
      parsed.data.website === undefined
        ? undefined
        : parsed.data.website === ""
          ? null
          : (parsed.data.website ?? null),
  });
  return NextResponse.json({ sponsor });
}

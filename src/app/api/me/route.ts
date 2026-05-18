import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, writeAccessDeniedResponse } from "@/lib/auth";
import {
  normalizeProfilePayload,
  updateProfileSchema,
} from "@/lib/validation/profile";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const writeDenied = writeAccessDeniedResponse(user);
  if (writeDenied) return writeDenied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const n = normalizeProfilePayload(parsed.data);

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: n.firstName,
        lastName: n.lastName,
        name: n.displayName,
        birthYear: n.birthYear,
        phone: n.phone,
        street: n.street,
        city: n.city,
        state: n.state,
        zip: n.zip,
      },
    });
  } catch (e) {
    console.error("PATCH /api/me update failed", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2022") {
        return NextResponse.json(
          {
            error:
              "Your database is missing a profile column. Run: npx prisma migrate deploy",
          },
          { status: 500 }
        );
      }
    }
    const msg = e instanceof Error ? e.message : "";
    if (
      msg.includes("Unknown argument") ||
      msg.includes("Unknown field") ||
      msg.includes("PrismaClientValidationError")
    ) {
      return NextResponse.json(
        {
          error:
            "The Prisma client is out of date for this schema. Stop the dev server, run: npx prisma generate && npx prisma migrate deploy — then delete the .next folder and run npm run dev again.",
        },
        { status: 500 }
      );
    }
    const detail =
      process.env.NODE_ENV === "development" && e instanceof Error
        ? e.message
        : "Could not update your profile. Try again.";
    return NextResponse.json({ error: detail }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

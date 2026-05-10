import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { vehicleWriteSchema } from "@/lib/validation/registration";
import { isEventAssetsPublicUrl } from "@/lib/storage/public-asset-url";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vehicles = await prisma.vehicle.findMany({
    where: { userId: user.id },
    orderBy: [{ make: "asc" }, { model: "asc" }],
  });

  return NextResponse.json({ vehicles });
}

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

  const parsed = vehicleWriteSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const rawPhoto = parsed.data.photoUrl ?? null;
  if (
    typeof rawPhoto === "string" &&
    !isEventAssetsPublicUrl(rawPhoto)
  ) {
    return NextResponse.json(
      { error: "Vehicle photo must be uploaded through this app." },
      { status: 400 }
    );
  }

  try {
    const v = await prisma.vehicle.create({
      data: {
        userId: user.id,
        year: parsed.data.year,
        make: parsed.data.make,
        model: parsed.data.model,
        trim: parsed.data.trim || null,
        nickname: parsed.data.nickname ?? null,
        vin: parsed.data.vin ?? null,
        notes: parsed.data.notes || null,
        photoUrl: rawPhoto,
      },
    });

    return NextResponse.json(v, { status: 201 });
  } catch (e) {
    console.error("POST /api/vehicles:", e);
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2022"
    ) {
      return NextResponse.json(
        {
          error:
            "Database is missing vehicle columns. Run: npx prisma migrate deploy",
        },
        { status: 503 }
      );
    }
    if (e instanceof Prisma.PrismaClientValidationError) {
      return NextResponse.json(
        {
          error:
            "Could not save vehicle. Run `npx prisma generate` and restart the dev server.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Could not save vehicle. Try again." },
      { status: 500 }
    );
  }
}

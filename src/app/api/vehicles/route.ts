import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser, writeAccessDeniedResponse } from "@/lib/auth";
import { vehicleWriteSchema } from "@/lib/validation/registration";
import { savePrivateVehiclePhoto } from "@/lib/save-private-vehicle-photo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function parseVehicleFields(formData: FormData) {
  const yearRaw = formData.get("year");
  const make = formData.get("make");
  const model = formData.get("model");
  const trim = formData.get("trim");
  const nickname = formData.get("nickname");
  const vin = formData.get("vin");
  const notes = formData.get("notes");

  return vehicleWriteSchema.safeParse({
    year: yearRaw,
    make: typeof make === "string" ? make : "",
    model: typeof model === "string" ? model : "",
    trim: typeof trim === "string" && trim.trim() ? trim : undefined,
    nickname:
      typeof nickname === "string" && nickname.trim() ? nickname : undefined,
    vin: typeof vin === "string" && vin.trim() ? vin : undefined,
    notes: typeof notes === "string" && notes.trim() ? notes : undefined,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const writeDenied = writeAccessDeniedResponse(user);
  if (writeDenied) return writeDenied;

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Could not read upload. Try a smaller photo or restart the dev server." },
        { status: 400 },
      );
    }

    const parsed = parseVehicleFields(formData);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const photoFile = formData.get("photo");
    const hasPhoto =
      photoFile instanceof File && photoFile.size > 0 ? photoFile : null;

    try {
      const vehicle = await prisma.vehicle.create({
        data: {
          userId: user.id,
          year: parsed.data.year,
          make: parsed.data.make,
          model: parsed.data.model,
          trim: parsed.data.trim || null,
          nickname: parsed.data.nickname ?? null,
          vin: parsed.data.vin ?? null,
          notes: parsed.data.notes || null,
          photoUrl: null,
        },
      });

      if (hasPhoto) {
        const saved = await savePrivateVehiclePhoto(
          vehicle.id,
          user.id,
          hasPhoto,
          { isPrimary: true },
        );
        if (!saved.ok) {
          return NextResponse.json(
            {
              error: `Vehicle saved, but photo upload failed: ${saved.error}`,
              id: vehicle.id,
              photoError: saved.error,
            },
            { status: 201 },
          );
        }

        const updated = await prisma.vehicle.findUnique({
          where: { id: vehicle.id },
        });
        return NextResponse.json(updated ?? vehicle, { status: 201 });
      }

      return NextResponse.json(vehicle, { status: 201 });
    } catch (e) {
      console.error("POST /api/vehicles (multipart):", e);
      return NextResponse.json(
        { error: "Could not save vehicle. Try again." },
        { status: 500 },
      );
    }
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

  if (parsed.data.photoUrl !== undefined && parsed.data.photoUrl !== null) {
    return NextResponse.json(
      {
        error:
          "Garage photos must be uploaded with the vehicle form. Do not send photoUrl directly.",
      },
      { status: 400 },
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
        photoUrl: null,
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
        { status: 503 },
      );
    }
    if (e instanceof Prisma.PrismaClientValidationError) {
      return NextResponse.json(
        {
          error:
            "Could not save vehicle. Run `npx prisma generate` and restart the dev server.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Could not save vehicle. Try again." },
      { status: 500 },
    );
  }
}

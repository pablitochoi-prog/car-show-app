import { NextResponse } from "next/server";
import { getTrimsByModel, isNadaConfigured } from "@/lib/nada-api";

export async function GET(request: Request) {
  if (!isNadaConfigured()) {
    return NextResponse.json(
      { error: "Vehicle lookup is not configured." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const companynum = Number.parseInt(searchParams.get("companynum") ?? "", 10);
  const year = Number.parseInt(searchParams.get("year") ?? "", 10);
  const modelcat = searchParams.get("modelcat") ?? "";

  if (!Number.isFinite(companynum) || !Number.isFinite(year) || !modelcat) {
    return NextResponse.json(
      { error: "Provide companynum, year, and modelcat." },
      { status: 400 },
    );
  }

  try {
    const trims = await getTrimsByModel(companynum, year, modelcat);
    return NextResponse.json({ trims });
  } catch (err) {
    console.error("[vehicles/lookup/trims]", err);
    return NextResponse.json(
      { error: "Could not fetch trims. Try again." },
      { status: 502 },
    );
  }
}

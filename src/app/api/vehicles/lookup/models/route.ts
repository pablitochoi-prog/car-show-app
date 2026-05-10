import { NextResponse } from "next/server";
import { getModelsByMakeYear, isNadaConfigured } from "@/lib/nada-api";

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

  if (!Number.isFinite(companynum) || !Number.isFinite(year)) {
    return NextResponse.json(
      { error: "Provide companynum and year." },
      { status: 400 },
    );
  }

  try {
    const models = await getModelsByMakeYear(companynum, year);
    return NextResponse.json({ models });
  } catch (err) {
    console.error("[vehicles/lookup/models]", err);
    return NextResponse.json(
      { error: "Could not fetch models. Try again." },
      { status: 502 },
    );
  }
}

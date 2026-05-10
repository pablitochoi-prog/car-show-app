import { NextResponse } from "next/server";
import { getMakesByYear, isNadaConfigured } from "@/lib/nada-api";

export async function GET(request: Request) {
  if (!isNadaConfigured()) {
    const raw = process.env.NADA_VALUATION_API_KEY ?? "(undefined)";
    console.error(
      `[vehicles/lookup/makes] NADA key not found. Raw env value length: ${raw.length}, starts with: "${raw.slice(0, 4)}"`
    );
    return NextResponse.json(
      { error: "Vehicle lookup is not configured. Restart your dev server after setting NADA_VALUATION_API_KEY in .env.local." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const yearStr = searchParams.get("year") ?? "";
  const year = Number.parseInt(yearStr, 10);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    return NextResponse.json(
      { error: "Provide a valid year (1900–2100)." },
      { status: 400 },
    );
  }

  try {
    const makes = await getMakesByYear(year);
    return NextResponse.json({ makes });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[vehicles/lookup/makes]", msg);
    return NextResponse.json(
      { error: `Could not fetch makes: ${msg}` },
      { status: 502 },
    );
  }
}

import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** @deprecated Garage photos are private; use presign + complete instead. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Garage vehicle photos are stored privately. Save the vehicle, then upload a photo from My Vehicles or use the private upload API.",
    },
    { status: 410 },
  );
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadEventAsset } from "@/lib/storage/event-assets";

export const runtime = "nodejs";

const ALLOWED_IMAGE = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_BYTES = 8 * 1024 * 1024;

type RouteParams = { params: Promise<{ id: string }> };

/** Public sale-listing photo upload during registration (logged-in or guest). */
export async function POST(request: Request, { params }: RouteParams) {
  const { id: eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { status: true, vehicleSaleInquiriesEnabled: true },
  });
  if (
    !event ||
    !["PUBLISHED", "ACTIVE"].includes(event.status) ||
    !event.vehicleSaleInquiriesEnabled
  ) {
    return NextResponse.json(
      { error: "Vehicle sale inquiries are not enabled for this event." },
      { status: 400 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart form data" },
      { status: 400 },
    );
  }

  const listingId = String(formData.get("listingId") ?? "").trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      listingId,
    )
  ) {
    return NextResponse.json({ error: "Invalid listing id." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File is too large (max 8MB)" },
      { status: 400 },
    );
  }

  const type = file.type || "application/octet-stream";
  if (!ALLOWED_IMAGE.has(type)) {
    return NextResponse.json(
      { error: "Use a JPG, PNG, WebP, or GIF image." },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const safeExt = /^[a-z0-9]{2,5}$/.test(ext) ? ext : "png";
  const objectKey = `events/${eventId}/sale-listings/${listingId}/${crypto.randomUUID()}.${safeExt}`;

  const result = await uploadEventAsset(objectKey, buf, type);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    url: result.publicUrl,
    objectKey,
    originalName: file.name,
    contentType: type,
  });
}

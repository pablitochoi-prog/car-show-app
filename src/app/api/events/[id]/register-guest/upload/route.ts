import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadEventAsset } from "@/lib/storage/event-assets";
import {
  enforcePublicRateLimit,
  hashRateLimitKey,
  resolveClientIp,
  resolvePublicRateLimitConfig,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

const ALLOWED_IMAGE = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_BYTES = 8 * 1024 * 1024;

type RouteParams = { params: Promise<{ id: string }> };

/** Public vehicle photo upload during guest registration (before account exists). */
export async function POST(request: Request, { params }: RouteParams) {
  const { id: eventId } = await params;

  // Rate-limit by IP: reuses guestRegister limits (10 per 10 min per IP).
  const ip = resolveClientIp(request);
  const rateLimitKey = `guest-upload:${eventId}:${ip ? hashRateLimitKey(ip) : "no-ip"}`;
  const rateLimitBlocked = enforcePublicRateLimit({
    route: "events.[id].register-guest.upload",
    scope: "guest-upload",
    key: rateLimitKey,
    config: resolvePublicRateLimitConfig("guestRegister"),
  });
  if (rateLimitBlocked) return rateLimitBlocked;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { status: true },
  });
  if (!event || !["PUBLISHED", "ACTIVE"].includes(event.status)) {
    return NextResponse.json(
      { error: "Registration is not open for this event" },
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
  const path = `guest-vehicle-photos/${eventId}/${crypto.randomUUID()}.${safeExt}`;

  const result = await uploadEventAsset(path, buf, type);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    url: result.publicUrl,
    originalName: file.name,
  });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { uploadEventAsset } from "@/lib/storage/event-assets";

export const runtime = "nodejs";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

const MAX_BYTES = 8 * 1024 * 1024;

const SAFE_EXT = /^[a-z0-9]{2,5}$/;

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  const allowed = await canManageEvent(user.id, eventId, undefined, user.platformRole);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, orgId: true, flyerUrl: true, logoUrl: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const orgIdForUpload = event.orgId;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const flyer = formData.get("flyer");
  const logo = formData.get("logo");

  const updates: { flyerUrl?: string; logoUrl?: string } = {};

  async function handleFile(
    entry: FormDataEntryValue | null,
    kind: "flyer" | "logo"
  ) {
    if (!entry || !(entry instanceof File) || entry.size === 0) return;

    if (entry.size > MAX_BYTES) {
      throw new Error(`${kind} file is too large (max 8MB)`);
    }

    const type = entry.type || "application/octet-stream";
    if (!ALLOWED.has(type)) {
      throw new Error(`${kind}: unsupported file type`);
    }

    const buf = Buffer.from(await entry.arrayBuffer());
    const rawExt = (entry.name.split(".").pop() || "").toLowerCase();
    const fallback = kind === "flyer" ? "jpg" : "png";
    const ext = SAFE_EXT.test(rawExt) ? rawExt : fallback;
    /** Stable path when org is unset (new events); URLs stored on `Event` for public pages. */
    const folder = orgIdForUpload ?? "pending-org";
    const path = `${folder}/${eventId}/${kind}.${ext}`;

    const result = await uploadEventAsset(path, buf, type);
    if ("error" in result) {
      throw new Error(result.error);
    }

    if (kind === "flyer") updates.flyerUrl = result.publicUrl;
    else updates.logoUrl = result.publicUrl;
  }

  try {
    await handleFile(flyer, "flyer");
    await handleFile(logo, "logo");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No flyer or logo file provided" },
      { status: 400 }
    );
  }

  await prisma.event.update({
    where: { id: eventId },
    data: updates,
  });

  return NextResponse.json({
    flyerUrl: updates.flyerUrl ?? event.flyerUrl,
    logoUrl: updates.logoUrl ?? event.logoUrl,
  });
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import { savePlatformSponsor } from "@/lib/platform-sponsor";
import { uploadPublicPhoto } from "@/lib/storage/public-photos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_IMAGE = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_BYTES = 8 * 1024 * 1024;
const SAFE_EXT = /^[a-z0-9]{2,5}$/;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      { error: "Use a JPG, PNG, WebP, or GIF image for the logo." },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const rawExt = (file.name.split(".").pop() || "").toLowerCase();
  const ext = SAFE_EXT.test(rawExt) ? rawExt : "png";
  const path = `platform/sponsor/${crypto.randomUUID()}.${ext}`;

  const result = await uploadPublicPhoto(path, buf, type);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const sponsor = await savePlatformSponsor({ logoUrl: result.publicUrl });

  return NextResponse.json({
    sponsor,
    logoUrl: result.publicUrl,
    originalName: file.name,
  });
}

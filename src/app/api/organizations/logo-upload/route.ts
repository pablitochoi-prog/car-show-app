import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { uploadEventAsset } from "@/lib/storage/event-assets";

export const runtime = "nodejs";

const ALLOWED_IMAGE = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large (max 8MB)" }, { status: 400 });
  }

  const type = file.type || "application/octet-stream";
  if (!ALLOWED_IMAGE.has(type)) {
    return NextResponse.json(
      { error: "Use a JPG, PNG, WebP, or GIF image for the logo." },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const safeExt = /^[a-z0-9]{2,5}$/.test(ext) ? ext : "png";
  const path = `organization-logos/${user.id}/${crypto.randomUUID()}.${safeExt}`;

  const result = await uploadEventAsset(path, buf, type);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    url: result.publicUrl,
    originalName: file.name,
  });
}

import { NextResponse } from "next/server";
import { getCurrentUser, writeAccessDeniedResponse } from "@/lib/auth";
import { saveProfilePhoto } from "@/lib/save-profile-photo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const writeDenied = writeAccessDeniedResponse(user);
  if (writeDenied) return writeDenied;

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

  const saved = await saveProfilePhoto(user.id, file);
  if (!saved.ok) {
    return NextResponse.json({ error: saved.error }, { status: saved.status });
  }

  return NextResponse.json({
    viewUrl: saved.viewUrl,
    objectKey: saved.objectKey,
  });
}

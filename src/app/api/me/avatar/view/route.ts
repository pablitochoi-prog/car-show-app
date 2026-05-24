import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readPrivateAsset } from "@/lib/storage/private-assets";
import { userHasProfilePhoto } from "@/lib/profile-photo-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatarUrl: true },
  });

  if (!profile?.avatarUrl || !userHasProfilePhoto(profile.avatarUrl)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const asset = await readPrivateAsset(profile.avatarUrl);
  if ("error" in asset) {
    return NextResponse.json({ error: asset.error }, { status: 404 });
  }

  return new NextResponse(asset.bytes, {
    status: 200,
    headers: {
      "Content-Type": asset.contentType || "image/jpeg",
      "Cache-Control": "private, max-age=300",
    },
  });
}

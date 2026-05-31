import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["mark_contacted", "archive"]),
});

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const inquiry = await prisma.vehicleSaleInquiry.findFirst({
    where: { id, sellerUserId: user.id },
    select: { id: true },
  });
  if (!inquiry) {
    return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  if (parsed.data.action === "mark_contacted") {
    await prisma.vehicleSaleInquiry.update({
      where: { id },
      data: {
        status: "CONTACTED",
        contactedAt: new Date(),
      },
    });
  } else {
    await prisma.vehicleSaleInquiry.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });
  }

  return NextResponse.json({ ok: true });
}

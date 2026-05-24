import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import { isLockedPublicVoteAward } from "@/lib/sms/public-vote-awards";
import { ensureLockedPublicVoteAwards } from "@/lib/sms/sms-voting-eligible-awards";

function serializeAward(a: {
  id: string;
  name: string;
  isSystem: boolean;
  sortOrder: number;
  smsVotingEligible: boolean;
}) {
  return {
    id: a.id,
    name: a.name,
    isSystem: a.isSystem,
    sortOrder: a.sortOrder,
    smsVotingEligible: a.smsVotingEligible,
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ensureLockedPublicVoteAwards();

  const awards = await prisma.specialAward.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ awards: awards.map(serializeAward) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();
  if (!name || name.length < 1) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const existing = await prisma.specialAward.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json(
      { error: "An award with that name already exists." },
      { status: 409 },
    );
  }

  const maxSort = await prisma.specialAward.aggregate({
    _max: { sortOrder: true },
  });
  const award = await prisma.specialAward.create({
    data: {
      name,
      isSystem: true,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  return NextResponse.json({ award: serializeAward(award) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    orderedIds?: string[];
    id?: string;
    name?: string;
    smsVotingEligible?: boolean;
  };

  if (body.id && typeof body.smsVotingEligible === "boolean") {
    const existing = await prisma.specialAward.findUnique({
      where: { id: body.id },
      select: { name: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Award not found." }, { status: 404 });
    }
    if (isLockedPublicVoteAward(existing.name) && !body.smsVotingEligible) {
      return NextResponse.json(
        {
          error:
            "People's Choice and Kid's Choice are always public vote categories.",
        },
        { status: 400 },
      );
    }

    await prisma.specialAward.update({
      where: { id: body.id },
      data: { smsVotingEligible: body.smsVotingEligible },
    });
    const updated = await prisma.specialAward.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ awards: updated.map(serializeAward) });
  }

  if (body.id && body.name?.trim()) {
    const name = body.name.trim();
    const current = await prisma.specialAward.findUnique({
      where: { id: body.id },
      select: { name: true },
    });
    if (!current) {
      return NextResponse.json({ error: "Award not found." }, { status: 404 });
    }
    if (isLockedPublicVoteAward(current.name)) {
      return NextResponse.json(
        {
          error:
            "People's Choice and Kid's Choice cannot be renamed.",
        },
        { status: 400 },
      );
    }
    const dup = await prisma.specialAward.findFirst({
      where: { name, NOT: { id: body.id } },
    });
    if (dup) {
      return NextResponse.json(
        { error: "An award with that name already exists." },
        { status: 409 },
      );
    }
    await prisma.specialAward.update({
      where: { id: body.id },
      data: { name },
    });
    const updated = await prisma.specialAward.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ awards: updated.map(serializeAward) });
  }

  if (!body.orderedIds?.length) {
    return NextResponse.json(
      { error: "orderedIds, id+name, or id+smsVotingEligible required" },
      { status: 400 },
    );
  }

  await prisma.$transaction(
    body.orderedIds.map((id, i) =>
      prisma.specialAward.update({ where: { id }, data: { sortOrder: i } }),
    ),
  );

  const updated = await prisma.specialAward.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ awards: updated.map(serializeAward) });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing award id." }, { status: 400 });
  }

  const existing = await prisma.specialAward.findUnique({
    where: { id },
    select: { name: true },
  });
  if (existing && isLockedPublicVoteAward(existing.name)) {
    return NextResponse.json(
      {
        error:
          "People's Choice and Kid's Choice cannot be removed from the master list.",
      },
      { status: 400 },
    );
  }

  await prisma.specialAward.delete({ where: { id } }).catch(() => null);

  return NextResponse.json({ ok: true });
}

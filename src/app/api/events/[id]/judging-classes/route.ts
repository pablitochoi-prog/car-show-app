import { NextResponse } from "next/server";
import { canManageEvent, getCurrentUser } from "@/lib/auth";
import {
  createEventJudgingClass,
  listEventJudgingClasses,
} from "@/lib/judging/event-judging-class-service";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const allowed = await canManageEvent(
    user.id,
    eventId,
    undefined,
    user.platformRole,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const classes = await listEventJudgingClasses(eventId);
  return NextResponse.json({ classes });
}

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const allowed = await canManageEvent(
    user.id,
    eventId,
    undefined,
    user.platformRole,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = (body ?? {}) as {
    name?: string;
    description?: string | null;
    eventJudgingTemplateId?: string;
    eligibleEventCategoryIds?: string[];
    isActive?: boolean;
    sortOrder?: number;
  };

  if (!data.name?.trim() || !data.eventJudgingTemplateId) {
    return NextResponse.json(
      { error: "name and eventJudgingTemplateId are required." },
      { status: 400 },
    );
  }

  try {
    const judgingClass = await createEventJudgingClass(eventId, {
      name: data.name,
      description: data.description,
      eventJudgingTemplateId: data.eventJudgingTemplateId,
      eligibleEventCategoryIds: data.eligibleEventCategoryIds ?? [],
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    });
    return NextResponse.json({ class: judgingClass }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

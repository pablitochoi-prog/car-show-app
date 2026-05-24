import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildIcsForEvent } from "@/lib/event-calendar";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      showNumber: true,
      description: true,
      venue: true,
      street: true,
      city: true,
      state: true,
      zip: true,
      startDate: true,
      endDate: true,
      startTime: true,
      endTime: true,
      dailyHours: true,
      eventWebsite: true,
      status: true,
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const publicStatuses = ["PUBLISHED", "ACTIVE", "COMPLETED"];
  if (!publicStatuses.includes(event.status)) {
    return NextResponse.json({ error: "Event not available" }, { status: 404 });
  }

  const { filename, content } = buildIcsForEvent({
    eventId: event.id,
    name: event.name,
    showNumber: event.showNumber,
    description: event.description,
    venue: event.venue,
    street: event.street,
    city: event.city,
    state: event.state,
    zip: event.zip,
    startDate: event.startDate,
    endDate: event.endDate,
    startTime: event.startTime,
    endTime: event.endTime,
    dailyHours: event.dailyHours,
    eventWebsite: event.eventWebsite,
  });

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

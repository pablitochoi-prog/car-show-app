import { NextResponse } from "next/server";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { countUnreadMessagesForUserAndEvent } from "@/lib/unread-messages";

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/events/:id/messages/unread-count — unread inbox count for this event. */
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

  const count = await countUnreadMessagesForUserAndEvent(user.id, eventId);
  return NextResponse.json({ count });
}

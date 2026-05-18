import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { countUnreadMessagesForUser } from "@/lib/unread-messages";

/** GET /api/messages/unread-count — inbox unread count for the current user. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await countUnreadMessagesForUser(user.id);
  return NextResponse.json({ count });
}

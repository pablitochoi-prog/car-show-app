import { getCurrentUser } from "@/lib/auth";
import { countUnreadMessagesForUser } from "@/lib/unread-messages";
import { UnreadMessagesProvider } from "@/components/messages/unread-messages-provider";

/** Wraps the app shell with live unread message counts for logged-in users. */
export async function UnreadMessagesShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const initialCount = user
    ? await countUnreadMessagesForUser(user.id)
    : 0;

  return (
    <UnreadMessagesProvider initialCount={initialCount} enabled={!!user}>
      {children}
    </UnreadMessagesProvider>
  );
}

import type { User } from "@prisma/client";
import { isUserSuspended } from "@/lib/user-access";
import { isSiteAdmin } from "@/lib/permissions";

export function SuspendedAccountBanner({ user }: { user: User }) {
  if (!isUserSuspended(user) || isSiteAdmin(user)) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
    >
      <p className="font-medium">Account suspended — read-only access</p>
      <p className="mt-1 text-amber-900/80 dark:text-amber-100/80">
        You can view your account but cannot register, edit, or send messages
        until an administrator reactivates your account.
        {user.statusReason ? ` Reason: ${user.statusReason}` : ""}
      </p>
    </div>
  );
}

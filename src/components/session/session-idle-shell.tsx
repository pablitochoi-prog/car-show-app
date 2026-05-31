import { getCurrentUser } from "@/lib/auth";
import { SessionIdleProvider } from "@/components/session/session-idle-provider";

/** Mount idle session UX only for authenticated users. */
export async function SessionIdleShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <SessionIdleProvider enabled={!!user}>{children}</SessionIdleProvider>
  );
}

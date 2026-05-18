import { getCurrentUser, getSession } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import type { PlatformRole } from "@/types";

export async function SiteHeader() {
  const sessionUser = await getSession();
  const isLoggedIn = Boolean(sessionUser);
  const user = isLoggedIn ? await getCurrentUser() : null;

  return (
    <Header
      isLoggedIn={isLoggedIn}
      user={
        user
          ? {
              name: user.name,
              email: user.email,
              platformRole: user.platformRole as PlatformRole,
            }
          : null
      }
    />
  );
}

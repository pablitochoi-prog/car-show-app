import { getCurrentUser } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import type { PlatformRole } from "@/types";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <Header
      isLoggedIn={Boolean(user)}
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

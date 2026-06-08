import { getCurrentUser } from "@/lib/auth";
import { userHasJudgeStaffRoleOnAnyEvent } from "@/lib/event-staff";
import { Header } from "@/components/layout/header";
import type { PlatformRole } from "@/types";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const hasJudgeStaffRole = user
    ? await userHasJudgeStaffRoleOnAnyEvent(user.id)
    : false;

  return (
    <Header
      isLoggedIn={Boolean(user)}
      user={
        user
          ? {
              name: user.name,
              email: user.email,
              platformRole: user.platformRole as PlatformRole,
              hasJudgeStaffRole,
            }
          : null
      }
    />
  );
}

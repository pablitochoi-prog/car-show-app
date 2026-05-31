import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMfaSessionState } from "@/lib/mfa-session";
import { getAdminMfaGuardState } from "@/lib/admin-mfa-guards";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MfaChallengeForm } from "@/components/auth/mfa-challenge-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function LoginMfaPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { redirect: redirectTo } = await searchParams;
  const safeRedirect =
    redirectTo?.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/dashboard";

  const supabase = await createClient();
  const mfa = await getMfaSessionState(supabase);
  const guard = getAdminMfaGuardState(user, mfa);

  if (!guard.isAdmin) {
    redirect(safeRedirect);
  }

  if (!guard.needsMfaChallenge) {
    redirect(safeRedirect);
  }

  return (
    <AuthPageShell>
      <Card>
        <CardHeader>
          <CardTitle>Admin sign-in verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MfaChallengeForm redirectTo={safeRedirect} />
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "w-full",
            )}
          >
            Sign in with a different account
          </Link>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}

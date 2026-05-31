import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AccountNav } from "@/components/account/account-nav";
import { AdminMfaSetup } from "@/components/security/admin-mfa-setup";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SecurityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="page-shell max-w-2xl space-y-6">
      <div className="page-head flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Account security</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage sign-in protection for your account.
          </p>
        </div>
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Back to dashboard
        </Link>
      </div>

      <AccountNav />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Authenticator app (TOTP)</CardTitle>
          <CardDescription>
            Time-based one-time passwords from apps like Google Authenticator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminMfaSetup />
        </CardContent>
      </Card>
    </div>
  );
}

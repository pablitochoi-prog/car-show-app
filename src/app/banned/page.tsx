import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function BannedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status !== "BANNED") redirect("/dashboard");

  return (
    <div className="page-shell flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Account restricted</h1>
        <p className="text-sm text-muted-foreground">
          Your account has been banned from CarShowScout. You cannot access
          dashboard or registration features.
        </p>
        {user.statusReason ? (
          <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {user.statusReason}
          </p>
        ) : null}
      </div>
      <form action="/api/auth/logout" method="POST">
        <button type="submit" className={cn(buttonVariants({ variant: "outline" }))}>
          Sign out
        </button>
      </form>
      <p className="text-xs text-muted-foreground">
        Questions?{" "}
        <Link href="/" className="underline hover:text-foreground">
          Return home
        </Link>
      </p>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function MyAwardsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="page-shell max-w-3xl space-y-8">
      <div className="page-head flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">My awards</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Awards and placings from events will appear here once voting and
            judging are enabled for your registrations.
          </p>
        </div>
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-full justify-center sm:w-auto"
          )}
        >
          Back to dashboard
        </Link>
      </div>

      <div className="rounded-lg border border-dashed bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
        No awards to show yet. This section will list results when your events
        support awards.
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import { Calendar, Car, Trophy, Users, UserCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DashboardMessagesTile } from "@/components/dashboard/dashboard-messages-tile";

const destinations = [
  {
    href: "/dashboard/events",
    title: "My Events",
    description:
      "Managing vs participating: staff roles, registrations, and listings.",
    icon: Calendar,
  },
  {
    href: "/dashboard/vehicles",
    title: "My Vehicles",
    description: "Saved vehicles to reuse when registering for shows.",
    icon: Car,
  },
  {
    href: "/dashboard/awards",
    title: "My Awards",
    description: "Awards and placings from events you entered.",
    icon: Trophy,
  },
  {
    href: "/dashboard/clubs",
    title: "My Clubs",
    description: "Car clubs and organizations you belong to.",
    icon: Users,
  },
  {
    href: "/dashboard/profile",
    title: "My Profile",
    description: "Your account name, email, and contact details.",
    icon: UserCircle,
  },
] as const;

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="page-shell max-w-4xl">
      <div className="page-head">
        <h1 className="text-3xl font-bold">Welcome, {user.name}</h1>
        <p className="mt-1 text-muted-foreground">
          Choose where to go next
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {destinations.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm",
              "transition-colors hover:bg-accent/45 hover:border-primary/35",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          >
              <div className="flex flex-row items-start gap-3">
                <Icon
                  className="mt-0.5 h-6 w-6 shrink-0 text-primary"
                  aria-hidden
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <h2 className="text-lg font-semibold leading-snug tracking-tight">
                    {title}
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              </div>
          </Link>
        ))}

        <DashboardMessagesTile />

        {isSiteAdmin(user) && (
          <Link
            href="/admin"
            className={cn(
              "flex flex-col rounded-xl border-2 border-primary/30 bg-primary/5 p-6 text-card-foreground shadow-sm",
              "transition-colors hover:bg-primary/10 hover:border-primary/50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          >
            <div className="flex flex-row items-start gap-3">
              <ShieldCheck
                className="mt-0.5 h-6 w-6 shrink-0 text-primary"
                aria-hidden
              />
              <div className="min-w-0 flex-1 space-y-2">
                <h2 className="text-lg font-semibold leading-snug tracking-tight">
                  Site Admin
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Manage clubs, events, accounts, vehicles, awards, and global settings.
                </p>
              </div>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}

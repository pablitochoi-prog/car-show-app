import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { DashboardAwardsTile } from "@/components/dashboard/dashboard-awards-tile";
import { DashboardMessagesTile } from "@/components/dashboard/dashboard-messages-tile";
import { NavTileLink } from "@/components/navigation/nav-tile-link";

const destinations = [
  {
    href: "/dashboard/events",
    title: "My Events",
    description:
      "Managing vs participating: staff roles, registrations, and listings.",
    icon: "calendar" as const,
  },
  {
    href: "/dashboard/vehicles",
    title: "My Vehicles",
    description: "Saved vehicles to reuse when registering for shows.",
    icon: "car" as const,
  },
  {
    href: "/dashboard/sale-inquiries",
    title: "Sale Inquiries",
    description: "Buyer messages for vehicles you listed for sale at shows.",
    icon: "tag" as const,
  },
  {
    href: "/judge",
    title: "My Judging",
    description: "Judge ballot voting — vote for vehicles at assigned events.",
    icon: "trophy" as const,
  },
  {
    href: "/dashboard/clubs",
    title: "My Clubs",
    description: "Car clubs and organizations you belong to.",
    icon: "users" as const,
  },
  {
    href: "/dashboard/profile",
    title: "My Profile",
    description: "Your account name, email, and contact details.",
    icon: "user-circle" as const,
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
        {destinations.map(({ href, title, description, icon }) => (
          <NavTileLink
            key={href}
            href={href}
            title={title}
            description={description}
            icon={icon}
          />
        ))}

        <DashboardAwardsTile userId={user.id} />

        <DashboardMessagesTile />

        {isSiteAdmin(user) && (
          <NavTileLink
            href="/admin/sale-inquiries"
            title="All Sale Inquiries"
            description="Review buyer inquiries from vehicle sale listings across all events."
            icon="tag"
            className={cn(
              "border-2 border-primary/30 bg-primary/5",
              "hover:bg-primary/10 hover:border-primary/50",
            )}
          />
        )}

        {isSiteAdmin(user) && (
          <NavTileLink
            href="/admin"
            title="Site Admin"
            description="Manage clubs, events, accounts, vehicles, awards, and global settings."
            icon="shield-check"
            className={cn(
              "border-2 border-primary/30 bg-primary/5",
              "hover:bg-primary/10 hover:border-primary/50",
            )}
          />
        )}
      </div>
    </div>
  );
}

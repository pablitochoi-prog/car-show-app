import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function MyRegistrationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rows = await prisma.registration.findMany({
    where: { userId: user.id },
    include: {
      event: { select: { id: true, name: true, startDate: true, city: true, state: true } },
      tier: { select: { name: true, priceCents: true } },
      vehicles: {
        include: {
          vehicle: {
            select: { year: true, make: true, model: true, trim: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="page-shell max-w-4xl space-y-6">
      <div className="page-head flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">My registrations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Events you&apos;ve signed up for as an exhibitor.
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

      {rows.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground sm:text-left">
          No registrations yet. Browse{" "}
          <Link href="/events" className="text-primary underline">
            published events
          </Link>{" "}
          and register your vehicles.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/events/${r.event.id}`}
                    className="font-semibold hover:underline"
                  >
                    {r.event.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {new Date(r.event.startDate).toLocaleDateString()}
                    {r.event.city || r.event.state
                      ? ` · ${[r.event.city, r.event.state].filter(Boolean).join(", ")}`
                      : ""}
                  </p>
                  <p className="text-sm mt-1">
                    Tier: {r.tier.name} (
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: "USD",
                    }).format(r.tier.priceCents / 100)}
                    ) · Status: <strong>{r.status}</strong>
                  </p>
                </div>
                <Link
                  href={`/events/${r.event.id}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Event page
                </Link>
              </div>
              <ul className="mt-3 text-sm text-muted-foreground list-disc list-inside">
                {r.vehicles.map((rv) => (
                  <li key={rv.id}>
                    {rv.vehicle.year} {rv.vehicle.make} {rv.vehicle.model}
                    {rv.vehicle.trim ? ` ${rv.vehicle.trim}` : ""}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

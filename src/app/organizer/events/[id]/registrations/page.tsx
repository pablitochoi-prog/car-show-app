import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEventAndLoad } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function EventRegistrationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id: eventId } = await params;

  const { allowed, event } = await canManageEventAndLoad(user.id, eventId, user.platformRole);
  if (!allowed || !event) notFound();

  const rows = await prisma.registration.findMany({
    where: { eventId },
    select: {
      id: true,
      status: true,
      user: { select: { name: true, email: true, phone: true } },
      tier: { select: { name: true, priceCents: true } },
      vehicles: {
        include: {
          vehicle: {
            select: { year: true, make: true, model: true, trim: true },
          },
        },
      },
      guestFirstName: true,
      guestLastName: true,
      guestEmail: true,
      guestPhone: true,
      guestVehicles: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="page-shell max-w-5xl space-y-6">
      <div className="text-center sm:text-left">
        <Link
          href="/dashboard/events"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← My events
        </Link>
      </div>

      <div className="page-head flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Registrations — {event.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} registrant{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <a
          href={`/api/events/${eventId}/registrations/export`}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "inline-flex w-full justify-center sm:w-auto"
          )}
        >
          Download CSV
        </a>
      </div>

      {rows.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground sm:text-left">
          No registrations yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Tier</th>
                <th className="p-3 font-medium">Vehicles</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isGuest = !r.user;
                const name = isGuest
                  ? `${r.guestFirstName ?? ""} ${r.guestLastName ?? ""}`.trim() || "Guest"
                  : r.user!.name;
                const regEmail = isGuest ? (r.guestEmail ?? "") : r.user!.email;

                type GV = { year?: number; make?: string; model?: string; trim?: string };
                const guestVehicleList: GV[] = Array.isArray(r.guestVehicles)
                  ? (r.guestVehicles as GV[])
                  : [];

                return (
                  <tr key={r.id} className="border-t">
                    <td className="p-3">
                      {r.status}
                      {isGuest && (
                        <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          Guest
                        </span>
                      )}
                    </td>
                    <td className="p-3">{name}</td>
                    <td className="p-3">{regEmail}</td>
                    <td className="p-3">{r.tier.name}</td>
                    <td className="p-3">
                      <ul className="list-disc list-inside">
                        {r.vehicles.map((rv) => (
                          <li key={rv.id}>
                            {rv.vehicle.year} {rv.vehicle.make}{" "}
                            {rv.vehicle.model}
                          </li>
                        ))}
                        {guestVehicleList.map((gv, gi) => (
                          <li key={`gv-${gi}`}>
                            {gv.year} {gv.make} {gv.model}
                            {gv.trim ? ` ${gv.trim}` : ""}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import { getOwnedGarageVehicle } from "@/lib/garage-vehicle";
import { EditVehicleForm } from "@/components/forms/edit-vehicle-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditVehiclePage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  let vehicle = await getOwnedGarageVehicle(user.id, id);
  if (!vehicle && isSiteAdmin(user)) {
    vehicle = await prisma.vehicle.findFirst({
      where: { id, archivedAt: null },
    });
  }

  if (!vehicle) notFound();

  if (vehicle.id !== id) {
    redirect(`/dashboard/vehicles/${vehicle.id}/edit`);
  }

  return (
    <div className="page-shell max-w-3xl space-y-8">
      <div className="page-head flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Edit vehicle</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your saved garage profile (not tied to a specific show).
          </p>
        </div>
        <Link
          href="/dashboard/vehicles"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-full justify-center sm:w-auto",
          )}
        >
          Back to My vehicles
        </Link>
      </div>

      <EditVehicleForm
        vehicleId={vehicle.id}
        initial={{
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          trim: vehicle.trim,
          nickname: vehicle.nickname,
          vin: vehicle.vin,
          notes: vehicle.notes,
          photoUrl: vehicle.photoUrl,
        }}
      />
    </div>
  );
}

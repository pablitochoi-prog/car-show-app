import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import { EditVehicleForm } from "@/components/forms/edit-vehicle-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditVehiclePage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const vehicle = isSiteAdmin(user)
    ? await prisma.vehicle.findUnique({ where: { id } })
    : await prisma.vehicle.findFirst({ where: { id, userId: user.id } });

  if (!vehicle) notFound();

  return (
    <div className="page-shell max-w-3xl space-y-8">
      <div className="page-head flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Edit vehicle</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update details for this saved vehicle.
          </p>
        </div>
        <Link
          href="/dashboard/vehicles"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-full justify-center sm:w-auto"
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

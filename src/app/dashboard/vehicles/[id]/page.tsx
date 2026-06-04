import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getOwnedGarageVehicle,
  loadGarageVehiclesForUser,
  type GarageVehicleListItem,
} from "@/lib/garage-vehicle";
import {
  loadGarageVehicleAwardsSection,
  type MyGarageVehicleAwardsSection,
} from "@/lib/my-vehicle-awards";
import { GarageVehicleView } from "@/components/dashboard/garage-vehicle-view";

type PageProps = { params: Promise<{ id: string }> };

export default async function GarageVehicleViewPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const vehicle = await getOwnedGarageVehicle(user.id, id);
  if (!vehicle) notFound();

  if (vehicle.id !== id) {
    redirect(`/dashboard/vehicles/${vehicle.id}`);
  }

  const listItem = (await loadGarageVehiclesForUser(user.id)).find(
    (v) => v.id === vehicle.id,
  );
  if (!listItem) notFound();

  const awardsSection =
    (await loadGarageVehicleAwardsSection(user.id, vehicle.id)) ??
    toAwardsSection(listItem);

  return <GarageVehicleView vehicle={listItem} awardsSection={awardsSection} />;
}

function toAwardsSection(vehicle: GarageVehicleListItem): MyGarageVehicleAwardsSection {
  return {
    vehicleId: vehicle.id,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim,
    nickname: vehicle.nickname,
    photoUrl: vehicle.photoUrl,
    awards: [],
  };
}

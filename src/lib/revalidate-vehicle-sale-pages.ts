import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export function revalidatePublicVehicleEntryPage(
  publicVehicleId: string | null | undefined,
): void {
  const code = publicVehicleId?.trim();
  if (!code) return;
  const encoded = encodeURIComponent(code);
  revalidatePath(`/v/${encoded}`);
  revalidatePath(`/v/${encoded}/sale`);
}

/** @deprecated Use revalidatePublicVehicleEntryPage */
export function revalidatePublicVehicleSalePage(
  publicVehicleId: string | null | undefined,
): void {
  revalidatePublicVehicleEntryPage(publicVehicleId);
}

export async function revalidateRegistrationVehicleEntryPages(
  registrationId: string,
): Promise<void> {
  const rows = await prisma.registrationVehicle.findMany({
    where: { registrationId },
    select: { publicVehicleId: true },
  });
  for (const row of rows) {
    revalidatePublicVehicleEntryPage(row.publicVehicleId);
  }
}

/** @deprecated Use revalidateRegistrationVehicleEntryPages */
export async function revalidateRegistrationVehicleSalePages(
  registrationId: string,
): Promise<void> {
  await revalidateRegistrationVehicleEntryPages(registrationId);
}

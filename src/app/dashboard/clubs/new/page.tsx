import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NewCarClubForm } from "./new-car-club-form";

export default async function NewCarClubPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <NewCarClubForm />;
}

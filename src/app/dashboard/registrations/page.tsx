import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadMyRegistrationCards } from "@/lib/dashboard-my-registrations";
import { buttonVariants } from "@/components/ui/button";
import { MyRegistrationCard } from "@/components/dashboard/registrations/my-registration-card";
import { cn } from "@/lib/utils";

export default async function MyRegistrationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const cards = await loadMyRegistrationCards(user.id);

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
            "w-full justify-center sm:w-auto",
          )}
        >
          Back to dashboard
        </Link>
      </div>

      {cards.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground sm:text-left">
          No registrations yet. Browse{" "}
          <Link href="/events" className="text-primary underline">
            published events
          </Link>{" "}
          and register your vehicles.
        </p>
      ) : (
        <ul className="space-y-4">
          {cards.map((card) => (
            <MyRegistrationCard key={card.id} card={card} />
          ))}
        </ul>
      )}
    </div>
  );
}

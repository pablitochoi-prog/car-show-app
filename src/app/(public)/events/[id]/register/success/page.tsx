import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Car, ArrowRight } from "lucide-react";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; tier?: string; count?: string }>;
};

export default async function RegistrationSuccessPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;

  const event = await prisma.event.findUnique({
    where: { id },
    select: { name: true, startDate: true, city: true, state: true },
  });

  if (!event) notFound();

  const status = sp.status ?? "CONFIRMED";
  const tierName = sp.tier ?? "Standard";
  const vehicleCount = parseInt(sp.count ?? "1", 10);
  const confirmed = status === "CONFIRMED";

  const eventDate = event.startDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const location = [event.city, event.state].filter(Boolean).join(", ");

  return (
    <div className="page-shell flex min-h-[50vh] items-start justify-center pt-12">
      <div className="mx-auto w-full max-w-lg space-y-6 text-center">
        {confirmed ? (
          <CheckCircle2 className="mx-auto size-16 text-emerald-500" />
        ) : (
          <Clock className="mx-auto size-16 text-amber-500" />
        )}

        <div>
          <h1 className="text-2xl font-bold">
            {confirmed ? "You're registered!" : "Registration received"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {confirmed
              ? "Your registration has been confirmed. See you at the show!"
              : "Your registration is pending payment. You'll be confirmed once payment is completed."}
          </p>
        </div>

        <div className="mx-auto max-w-sm space-y-3 rounded-xl border bg-card p-5 text-left text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Event
            </p>
            <p className="font-semibold">{event.name}</p>
            <p className="text-muted-foreground">
              {eventDate}
              {location ? ` · ${location}` : ""}
            </p>
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tier
            </p>
            <p className="font-medium">{tierName}</p>
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Vehicles
            </p>
            <p className="flex items-center gap-1.5 font-medium">
              <Car className="size-4 text-muted-foreground" />
              {vehicleCount} vehicle{vehicleCount !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </p>
            {confirmed ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="size-4" /> Confirmed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600">
                <Clock className="size-4" /> Pending Payment
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard/registrations"
            className={cn(buttonVariants(), "gap-2")}
          >
            My Registrations
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href={`/events/${id}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Back to event
          </Link>
        </div>
      </div>
    </div>
  );
}

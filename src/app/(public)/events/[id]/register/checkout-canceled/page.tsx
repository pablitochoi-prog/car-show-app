import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { XCircle, ArrowRight } from "lucide-react";
import { RetryCheckoutButton } from "@/components/stripe/retry-checkout-button";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ registration_id?: string }>;
};

export default async function CheckoutCanceledPage({
  params,
  searchParams,
}: Props) {
  const { id: eventId } = await params;
  const sp = await searchParams;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { name: true, showNumber: true },
  });

  if (!event) notFound();

  const registrationId = sp.registration_id;

  return (
    <div className="page-shell flex min-h-[50vh] items-start justify-center pt-12">
      <div className="mx-auto w-full max-w-lg space-y-6 text-center">
        <XCircle className="mx-auto size-16 text-muted-foreground" />

        <div>
          <h1 className="text-2xl font-bold">Payment Canceled</h1>
          <p className="mt-2 text-muted-foreground">
            Your checkout was canceled. No payment was charged. Your
            registration is still pending — you can try paying again.
          </p>
        </div>

        <div className="mx-auto max-w-sm rounded-xl border bg-card p-5 text-left text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Event
          </p>
          <p className="font-semibold">
            <EventNameWithNumber
              name={event.name}
              showNumber={event.showNumber}
            />
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {registrationId && (
            <RetryCheckoutButton registrationId={registrationId} />
          )}
          <Link
            href={`/events/${eventId}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Back to event
          </Link>
          <Link
            href="/dashboard/registrations"
            className={cn(buttonVariants({ variant: "ghost" }), "gap-2")}
          >
            My Registrations
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

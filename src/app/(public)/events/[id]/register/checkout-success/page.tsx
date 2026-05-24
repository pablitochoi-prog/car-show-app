import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { fulfillRegistrationFromCheckoutSession } from "@/lib/stripe-fulfill-checkout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { AddToCalendarMenu } from "@/components/events/add-to-calendar-menu";
import { buildAddToCalendarLinks } from "@/lib/event-calendar";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: Props) {
  const { id: eventId } = await params;
  const sp = await searchParams;
  const sessionId = sp.session_id;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      showNumber: true,
      description: true,
      venue: true,
      street: true,
      city: true,
      state: true,
      zip: true,
      startDate: true,
      endDate: true,
      startTime: true,
      endTime: true,
      dailyHours: true,
      eventWebsite: true,
    },
  });

  if (!event) notFound();

  const calendarLinks = buildAddToCalendarLinks({
    eventId: event.id,
    name: event.name,
    showNumber: event.showNumber,
    description: event.description,
    venue: event.venue,
    street: event.street,
    city: event.city,
    state: event.state,
    zip: event.zip,
    startDate: event.startDate,
    endDate: event.endDate,
    startTime: event.startTime,
    endTime: event.endTime,
    dailyHours: event.dailyHours,
    eventWebsite: event.eventWebsite,
  });

  let registration: {
    id: string;
    status: string;
    paymentStatus: string | null;
    tier: { name: string };
  } | null = null;

  if (sessionId) {
    try {
      await fulfillRegistrationFromCheckoutSession(sessionId);
    } catch (err) {
      console.error("[checkout-success] fulfill session", err);
    }

    registration = await prisma.registration.findUnique({
      where: { stripeCheckoutSessionId: sessionId },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        tier: { select: { name: true } },
      },
    });
  }

  const isPaid = registration?.paymentStatus === "PAID";

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
        {isPaid ? (
          <CheckCircle2 className="mx-auto size-16 text-emerald-500" />
        ) : (
          <Clock className="mx-auto size-16 text-amber-500" />
        )}

        <div>
          <h1 className="text-2xl font-bold">
            {isPaid ? "Payment Confirmed!" : "Payment Processing"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isPaid
              ? "Your payment has been received and your registration is confirmed. See you at the show!"
              : "Your payment is being processed. Your registration will be confirmed shortly once we receive confirmation from Stripe."}
          </p>
        </div>

        <div className="mx-auto max-w-sm space-y-3 rounded-xl border bg-card p-5 text-left text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Event
            </p>
            <p className="font-semibold">
              <EventNameWithNumber
                name={event.name}
                showNumber={event.showNumber}
              />
            </p>
            <p className="text-muted-foreground">
              {eventDate}
              {location ? ` · ${location}` : ""}
            </p>
          </div>

          {registration && (
            <>
              <div className="border-t pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tier
                </p>
                <p className="font-medium">{registration.tier.name}</p>
              </div>
              <div className="border-t pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Payment Status
                </p>
                {isPaid ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                    <CheckCircle2 className="size-4" /> Paid
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600">
                    <Clock className="size-4" /> Processing
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col items-center gap-3">
          <AddToCalendarMenu links={calendarLinks} />
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard/registrations"
            className={cn(buttonVariants(), "gap-2")}
          >
            My Registrations
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href={`/events/${eventId}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Back to event
          </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

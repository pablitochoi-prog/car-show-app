import type { Metadata } from "next";
import Link from "next/link";
import { SiteLogo } from "@/components/brand/site-logo";
import {
  Calendar,
  ClipboardList,
  MapPin,
  MessageSquare,
  Search,
  Smartphone,
  Trophy,
  Users,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getHomepageJsonLd, getHomepageMetadata } from "@/lib/homepage-seo";
import { getSiteOrigin } from "@/lib/site-url";

export const metadata: Metadata = getHomepageMetadata();

export default function HomePage() {
  const siteOrigin = getSiteOrigin();
  const jsonLd = getHomepageJsonLd(siteOrigin);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="flex flex-col">
        {/* Hero */}
        <section
          className="relative py-10 md:py-14"
          aria-labelledby="home-hero-heading"
        >
          <div className="page-shell max-w-3xl text-center">
            <div className="mb-4 flex justify-center">
              <SiteLogo size="hero" priority />
            </div>
            <h1
              id="home-hero-heading"
              className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl"
            >
              Find and Manage Car Shows with CarShowScout
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-base text-muted-foreground md:text-lg">
              Discover upcoming car shows, cruise-ins, and meets. Register your
              vehicles online, help organizers run smooth events, and vote by
              text for People&apos;s Choice and other awards.
            </p>
            <nav
              className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap"
              aria-label="Primary actions"
            >
              <Link
                href="/events"
                className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
              >
                <Search className="mr-2 size-5" aria-hidden />
                Browse car shows
              </Link>
              <Link
                href="/organizer/events/new"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "w-full sm:w-auto",
                )}
              >
                <Calendar className="mr-2 size-5" aria-hidden />
                Create an event
              </Link>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "w-full sm:w-auto",
                )}
              >
                Sign in
              </Link>
            </nav>
          </div>
        </section>

        {/* Local discovery */}
        <section
          className="border-y bg-muted/40 py-14"
          aria-labelledby="home-local-heading"
        >
          <div className="page-shell max-w-3xl text-center md:text-left">
            <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:gap-8">
              <MapPin
                className="size-10 shrink-0 text-primary md:mt-1"
                aria-hidden
              />
              <div>
                <h2
                  id="home-local-heading"
                  className="text-2xl font-bold tracking-tight md:text-3xl"
                >
                  Discover car shows near you
                </h2>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  Browse published events by city, state, date, and type—car
                  shows, cruise-ins, meets, and more. See venues, registration
                  details, and directions before you load the trailer.
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {/* TODO: Add dedicated /events/[state] and /events/[state]/[city] landing pages when event volume supports local SEO hubs. */}
                  Use filters on the events calendar to narrow results by
                  location and date.
                </p>
                <p className="mt-6">
                  <Link
                    href="/events"
                    className={cn(buttonVariants({ variant: "default" }))}
                  >
                    Search events by location
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Attendees & organizers */}
        <section className="py-16" aria-labelledby="home-features-heading">
          <div className="page-shell max-w-5xl">
            <h2
              id="home-features-heading"
              className="mb-4 text-center text-3xl font-bold tracking-tight"
            >
              Built for enthusiasts and show organizers
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
              From the first registration to the last trophy, CarShowScout keeps
              car show registration, classes, judging, and awards in one place.
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <Search className="mb-4 size-9 text-primary" aria-hidden />
                  <h3 className="mb-2 text-lg font-semibold">
                    Find upcoming car shows
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Explore a public events calendar with search by keyword,
                    city, state, and event type so you never miss a show in your
                    area.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Users className="mb-4 size-9 text-primary" aria-hidden />
                  <h3 className="mb-2 text-lg font-semibold">
                    Register vehicles for events
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Sign up online, choose classes, pay registration fees when
                    required, and manage your entries from your dashboard.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <ClipboardList
                    className="mb-4 size-9 text-primary"
                    aria-hidden
                  />
                  <h3 className="mb-2 text-lg font-semibold">
                    Manage car show registrations
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Organizers review registrants, assign classes, handle
                    check-in, and export lists—without juggling spreadsheets.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Calendar className="mb-4 size-9 text-primary" aria-hidden />
                  <h3 className="mb-2 text-lg font-semibold">
                    Event organizer tools
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Set up categories, awards, payment settings, staffing, and
                    sponsor details from a guided event setup workflow.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Smartphone className="mb-4 size-9 text-primary" aria-hidden />
                  <h3 className="mb-2 text-lg font-semibold">
                    SMS voting &amp; People&apos;s Choice
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Attendees text a vehicle code to vote in People&apos;s Choice
                    and other SMS-enabled awards. Dash cards show the number and
                    instructions.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Trophy className="mb-4 size-9 text-primary" aria-hidden />
                  <h3 className="mb-2 text-lg font-semibold">
                    Dash cards, judging &amp; awards
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Print dash cards with show IDs and QR codes, run judging
                    workflows, and track trophies and special awards.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* SMS compliance note */}
        <section
          className="bg-muted/50 py-12"
          aria-labelledby="home-sms-heading"
        >
          <div className="page-shell max-w-3xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <MessageSquare
                className="size-9 shrink-0 text-primary"
                aria-hidden
              />
              <div>
                <h2 id="home-sms-heading" className="text-xl font-bold">
                  Car show voting by text
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  When an event enables SMS voting, spectators can support
                  their favorite vehicles using the code on the dash card.
                  Message and data rates may apply. See our{" "}
                  <Link
                    href="/terms"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    SMS Text Policy
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Privacy Policy
                  </Link>{" "}
                  for details.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16" aria-labelledby="home-cta-heading">
          <div className="page-shell max-w-2xl text-center">
            <h2 id="home-cta-heading" className="mb-4 text-3xl font-bold">
              Ready to find or run your next show?
            </h2>
            <p className="mb-8 text-muted-foreground">
              Create a free account to register vehicles, manage events you
              organize, and keep track of shows you attend.
            </p>
            <nav
              className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center"
              aria-label="Get started"
            >
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Create your free account
                </Button>
              </Link>
              <Link
                href="/dashboard/events"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "w-full sm:w-auto",
                )}
              >
                Organizer dashboard
              </Link>
              <Link
                href="/events"
                className={cn(
                  buttonVariants({ size: "lg", variant: "ghost" }),
                  "w-full sm:w-auto",
                )}
              >
                View public events calendar
              </Link>
            </nav>
            <nav
              className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
              aria-label="Legal policies"
            >
              <Link
                href="/terms"
                className="font-medium underline-offset-4 hover:text-foreground hover:underline"
              >
                SMS Text Policy
              </Link>
              <Link
                href="/privacy"
                className="font-medium underline-offset-4 hover:text-foreground hover:underline"
              >
                Privacy Policy
              </Link>
            </nav>
          </div>
        </section>
      </div>
    </>
  );
}

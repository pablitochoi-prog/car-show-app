import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Trophy, Calendar, MapPin, Users } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative py-10 md:py-14">
        <div className="page-shell max-w-3xl text-center">
          <div className="mb-4 flex justify-center">
            {/*
              Safari ignores max-width on Next/Image when width/height attrs are large
              and w-full is set — use a fixed box + fill instead.
            */}
            <div className="relative mx-auto aspect-[1024/819] w-[205px] max-w-[72vw] shrink-0">
              <Image
                src="/brand/carshowscout-mark.png"
                alt="CarShowScout.com"
                fill
                sizes="205px"
                className="object-contain"
                priority
                unoptimized
              />
            </div>
          </div>
          <h1 className="mb-4 font-bold tracking-tight">
            <span className="block text-[calc(1.125rem*1.75*0.8)] font-semibold leading-tight text-foreground sm:text-[calc(1.25rem*1.75*0.8)] md:text-[calc(1.5rem*1.75*0.8)] md:whitespace-nowrap">
              Discover or Plan Amazing
            </span>
            <span className="mt-1 block text-[2.4rem] text-primary sm:text-[3rem] md:text-[3.6rem]">
              Car Shows
            </span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Find car shows near you, register your vehicles, vote for your
            favorites, and connect with the enthusiast community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/events">
              <Button size="lg" className="w-full sm:w-auto">
                <Search className="mr-2 h-5 w-5" />
                Find Events
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Calendar className="mr-2 h-5 w-5" />
                Organize a Show
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/50 py-16">
        <div className="page-shell max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need for Car Shows
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <MapPin className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Find Events</h3>
                <p className="text-muted-foreground text-sm">
                  Discover car shows near you by location, date, or type. Get
                  directions and event details instantly.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <Users className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  Register &amp; Manage
                </h3>
                <p className="text-muted-foreground text-sm">
                  Register your vehicles, pay online, and check in on event day
                  with a simple QR scan.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <Trophy className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Vote &amp; Win</h3>
                <p className="text-muted-foreground text-sm">
                  Vote for your favorite cars, compete for awards, and share
                  memories in the event scrapbook.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="page-shell max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8">
            Whether you&apos;re organizing a show or looking to attend one,
            CarShowApp makes it easy.
          </p>
          <Link href="/signup">
            <Button size="lg">Create Your Free Account</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

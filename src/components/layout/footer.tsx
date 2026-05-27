import Link from "next/link";
import { SiteSponsorLogo } from "@/components/platform/site-sponsor-logo";
import { getPlatformSponsor } from "@/lib/platform-sponsor";

export async function Footer() {
  const sponsor = await getPlatformSponsor();

  return (
    <footer className="border-t bg-muted/50 print:hidden">
      <div className="layout-bar flex-col items-center gap-6 py-8 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          &copy; {new Date().getFullYear()} CarShowScout.com. All rights
          reserved.
        </p>
        <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground md:justify-end">
          <Link href="/events" className="hover:text-foreground transition-colors">
            Find Events
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            SMS Terms
          </Link>
          <Link href="/login" className="hover:text-foreground transition-colors">
            Log In
          </Link>
        </nav>
      </div>
      {sponsor.logoUrl ? (
        <div className="layout-bar border-t border-border/60 py-4">
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center sm:gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Site sponsor
            </p>
            <SiteSponsorLogo
              logoUrl={sponsor.logoUrl}
              websiteUrl={sponsor.website}
              name={sponsor.name}
            />
          </div>
        </div>
      ) : null}
    </footer>
  );
}

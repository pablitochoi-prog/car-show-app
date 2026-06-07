import Link from "next/link";
import { SiteSponsorLogo } from "@/components/platform/site-sponsor-logo";
import { getPlatformSponsor } from "@/lib/platform-sponsor";

export async function Footer() {
  const sponsor = await getPlatformSponsor();
  const hasSponsor = Boolean(sponsor.logoUrl?.trim());

  return (
    <footer className="border-t bg-muted/50 print:hidden">
      <div className="layout-bar py-4 sm:py-5">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            {hasSponsor ? (
              <div className="flex flex-col items-center gap-1 sm:items-start">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Site sponsor
                </p>
                <SiteSponsorLogo
                  logoUrl={sponsor.logoUrl!}
                  websiteUrl={sponsor.website}
                  name={sponsor.name}
                  width={120}
                  height={40}
                  imageClassName="max-h-10 max-w-[120px]"
                />
              </div>
            ) : null}
            <p className="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
              &copy; {new Date().getFullYear()} Car Show Scout, LLC. All rights
              reserved.
            </p>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:justify-end sm:text-sm">
            <Link
              href="/events"
              className="transition-colors hover:text-foreground"
            >
              Find Events
            </Link>
            <Link
              href="/help"
              className="transition-colors hover:text-foreground"
            >
              Help Center
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-foreground"
            >
              SMS Text Policy
            </Link>
            <Link
              href="/privacy"
              className="transition-colors hover:text-foreground"
            >
              Privacy Policy
            </Link>
            <Link
              href="/sms"
              className="transition-colors hover:text-foreground"
            >
              SMS Program
            </Link>
            <Link
              href="/login"
              className="transition-colors hover:text-foreground"
            >
              Log In
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

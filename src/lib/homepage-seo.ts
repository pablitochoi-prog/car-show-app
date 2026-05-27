import type { Metadata } from "next";
import { getSiteOrigin } from "@/lib/site-url";

const SITE_NAME = "CarShowScout";
const DEFAULT_ORIGIN = "https://events.carshowscout.com";

export const HOMEPAGE_TITLE =
  "Car Show Discovery, Registration & SMS Voting | CarShowScout";

export const HOMEPAGE_DESCRIPTION =
  "Find car shows and cruise-ins near you. Register vehicles, manage event registrations, run People's Choice SMS voting, and print dash cards with CarShowScout.";

export function getHomepageMetadata(): Metadata {
  const origin = getSiteOrigin();
  const canonical = `${origin}/`;
  const ogImage = `${origin}/brand/carshowscout-logo.jpg`;

  return {
    title: HOMEPAGE_TITLE,
    description: HOMEPAGE_DESCRIPTION,
    metadataBase: new URL(origin),
    alternates: {
      canonical,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: canonical,
      siteName: SITE_NAME,
      title: HOMEPAGE_TITLE,
      description: HOMEPAGE_DESCRIPTION,
      images: [
        {
          url: ogImage,
          width: 1024,
          height: 819,
          alt: "CarShowScout logo",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: HOMEPAGE_TITLE,
      description: HOMEPAGE_DESCRIPTION,
      images: [ogImage],
    },
  };
}

export function getHomepageJsonLd(origin?: string): Record<string, unknown> {
  const siteUrl = (origin ?? getSiteOrigin()).replace(/\/$/, "") || DEFAULT_ORIGIN;
  const logoUrl = `${siteUrl}/brand/carshowscout-logo.jpg`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: SITE_NAME,
        url: siteUrl,
        description: HOMEPAGE_DESCRIPTION,
        publisher: { "@id": `${siteUrl}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/events?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: SITE_NAME,
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: logoUrl,
        },
      },
      {
        "@type": "WebApplication",
        "@id": `${siteUrl}/#application`,
        name: SITE_NAME,
        url: siteUrl,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "Web platform for discovering car shows, online vehicle registration, organizer event management, SMS People's Choice voting, dash cards, and awards.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        featureList: [
          "Car show and cruise-in discovery",
          "Vehicle registration and check-in",
          "Event organizer dashboards",
          "SMS voting for People's Choice awards",
          "Dash cards and printable show materials",
        ],
      },
    ],
  };
}

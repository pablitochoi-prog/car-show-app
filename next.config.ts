import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { buildSecurityHeaders } from "@/lib/security-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@opentelemetry/api"],
  experimental: {
    middlewareClientMaxBodySize: "12mb",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "photos.carshowscout.com",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    const isProduction = process.env.NODE_ENV === "production";
    return [{ source: "/(.*)", headers: buildSecurityHeaders(isProduction) }];
  },
};

const hasSentryDsn = Boolean(process.env.SENTRY_DSN?.trim());

export default hasSentryDsn
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
      automaticVercelMonitors: false,
      sourcemaps: {
        disable: !process.env.SENTRY_AUTH_TOKEN?.trim(),
      },
    })
  : nextConfig;

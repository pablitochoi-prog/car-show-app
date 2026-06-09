/**
 * HTTP security response headers for the Next.js config.
 *
 * Exported as a helper so the header set can be unit-tested independently
 * of the Sentry-wrapped next.config.ts export.
 */

/**
 * Content Security Policy in Report-Only mode.
 *
 * Allows the required sources for this app (Stripe, Supabase, R2 photos,
 * Sentry) without blocking rendering. Violations surface in the browser
 * console. Upgrade path: once violations settle, add a report-uri endpoint
 * and switch to Content-Security-Policy enforcement mode.
 */
export const CSP_REPORT_ONLY = [
  "default-src 'self'",
  // Next.js injects inline scripts for hydration; unsafe-eval is needed in dev.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  // Public car photos (R2), Supabase storage, data URIs for base64 images.
  "img-src 'self' data: blob: https://photos.carshowscout.com https://*.supabase.co",
  "font-src 'self'",
  // API connections: Supabase (REST + realtime WS), Stripe, Sentry ingest.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
  // Stripe hosted elements run in iframes.
  "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Redundant with X-Frame-Options DENY but included for CSP-aware browsers.
  "frame-ancestors 'none'",
].join("; ");

export type HeaderEntry = { key: string; value: string };

/**
 * Build the global security header set.
 *
 * @param isProduction - When true, HSTS is included (HTTPS-only environments).
 *   Pass `process.env.NODE_ENV === "production"` from next.config.ts.
 */
export function buildSecurityHeaders(isProduction: boolean): HeaderEntry[] {
  const headers: HeaderEntry[] = [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
    { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
  ];

  if (isProduction) {
    // 2-year HSTS; only safe over HTTPS, so excluded from local development.
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}

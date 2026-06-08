import { getSiteOrigin } from "@/lib/site-url";

/** Trusted Vercel deployment hosts from the platform-provided env vars. */
function trustedVercelHosts(): string[] {
  return [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]
    .map((host) => host?.trim().toLowerCase())
    .filter((host): host is string => Boolean(host));
}

function canonicalAppHost(): string | null {
  try {
    return new URL(getSiteOrigin()).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Allowlist for redirect/return hosts. Accepts only:
 * - the configured canonical app host (NEXT_PUBLIC_APP_URL)
 * - localhost / 127.0.0.1 / *.local (development)
 * - carshowscout.com and its true subdomains (dot-boundary, NOT a bare suffix)
 * - the current deployment's Vercel hosts (VERCEL_URL / VERCEL_BRANCH_URL /
 *   VERCEL_PROJECT_PRODUCTION_URL)
 *
 * Rejects spoofed/look-alike hosts such as `evilcarshowscout.com` and arbitrary
 * `*.vercel.app` deployments that are not the current project's.
 */
export function isTrustedAppHost(host: string | null | undefined): boolean {
  const normalized = host?.trim().toLowerCase();
  if (!normalized) return false;

  const hostname = normalized.split(":")[0];
  if (!hostname) return false;

  const canonical = canonicalAppHost();
  if (canonical && (normalized === canonical || hostname === canonical)) {
    return true;
  }

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local")
  ) {
    return true;
  }

  if (hostname === "carshowscout.com" || hostname.endsWith(".carshowscout.com")) {
    return true;
  }

  const vercelHosts = trustedVercelHosts();
  if (vercelHosts.includes(normalized) || vercelHosts.includes(hostname)) {
    return true;
  }

  return false;
}

/**
 * Resolve a safe absolute origin for server-issued redirects. Honors
 * `x-forwarded-host`/`x-forwarded-proto` only when the host is allowlisted;
 * otherwise falls back to the canonical site origin. This prevents
 * open-redirect / host-header injection via spoofed forwarded headers.
 */
export function resolveSafeRedirectOrigin(request: Request): string {
  const canonical = getSiteOrigin();
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (!forwardedHost || !isTrustedAppHost(forwardedHost)) {
    return canonical;
  }

  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const proto = forwardedProto === "http" ? "http" : "https";
  return `${proto}://${forwardedHost.trim()}`;
}
